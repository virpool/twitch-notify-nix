'use strict';

var path    = require('path'),
    _       = require('lodash'),
    async   = require('async');

var channelService  = require(path.join(process.cwd(), 'lib', 'channelService')),
    log             = require(path.join(process.cwd(), 'lib', 'log'));

var currentChannels;

function initClient() {
    channelService
        .fetchAll()
        .then(function (channels) {
            currentChannels = channels;
            buildUI();
        }, function (err) {
            log.error(err);
            process.exit(1);
        });
}

function buildUI() {
    var gui = require('nw.gui'),
        win = gui.Window.get(),
        isMinified = false;

    var tray = new gui.Tray({ title: gui.App.manifest.name, tooltip: 'Twitch Notify', icon: 'icon.png' });

    var menu = new gui.Menu();
    var showWinItem = new gui.MenuItem({
        label: 'Show main window',
        click: function () {
            _handleWindowState(false);
        }
    });
    var hideWinItem = new gui.MenuItem({
        label: 'Hide main window',
        click: function () {
            _handleWindowState(true);
        }
    });
    menu.append(hideWinItem);
    menu.append(new gui.MenuItem({ type: 'separator' }));
    menu.append(new gui.MenuItem({
        label: 'Exit',
        click: function() {
            gui.App.quit();
        }
    }));
    tray.menu = menu;

    tray.on('click', function() {
        _handleWindowState(false);
    });

    win.on('minimize', function() {
        _handleWindowState(true);
    });

    win.show();

    createClientApp(gui);

    function _handleWindowState(state) {
        isMinified = state;
        win[isMinified ? 'hide' : 'show']();
        if (isMinified) {
            menu.remove(hideWinItem);
            menu.append(showWinItem);
        } else {
            menu.remove(showWinItem);
            menu.append(hideWinItem);
        }
    }
}

function createClientApp(gui) {
    var lBtnAdd = Ladda.create(document.getElementById('add-channel'));
    var mainView = new Vue({
        el: '#workspace',
        data: {
            currentChannels: currentChannels,
            newChannelLink: '',
            isBusy: false,
            isActiveChannel: false,
            lastUpdateTime: Date.now()
        },
        methods: {
            addChannel: function () {
                var vm = this,
                    rname = /twitch.tv\/(.*)$/,
                    name;

                name = rname.exec(this.newChannelLink);
                if (name) {
                    name = name[1];
                } else {
                    name = this.newChannelLink;
                }

                vm.isBusy = true;
                lBtnAdd.start();
                fetch('https://api.twitch.tv/kraken/channels/' + name + '.json')
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (channel) {
                        vm.isBusy = false;
                        lBtnAdd.stop();

                        if (!channel || !channel.name) {
                            return;
                        }
                        channel.order = currentChannels.length;
                        channelService
                            .insert(channel)
                            .then(function () {
                                currentChannels.push(channel);
                                forceStatusUpdater();
                            }, function (err) {
                                log.error(err);
                            });
                    })
                    .catch(function (ex) {
                        // TODO: log it
                        v.isBusy = false;
                        lBtnAdd.stop();
                    });
            },
            openChannel: function (channel) {
                var cp = require('child_process'),
                    vm = this;

                vm.isActiveChannel = true;
                var streamer = cp.exec('livestreamer http://twitch.tv/' + channel.name + ' high', function (err) {
                    // TODO:
                });
                streamer.on('exit', function onStreamerExit() {
                    vm.isActiveChannel = false;
                    vm = null;
                });
            },
            removeChannel: function (channel) {
                var vm = this;
                channelService
                    .remove(channel)
                    .then(function () {
                        currentChannels.splice(_.indexOf(currentChannels, channel), 1);
                    }, function (err) {
                        log.error(err);
                    });
            }
        }
    });

    var updatedTimeoutId;

    function startStatusUpdater() {
        async.eachLimit(currentChannels, 5, function (channel, callback) {
            fetch('https://api.twitch.tv/kraken/streams/' + channel.name + '.json')
                .then(function (response) {
                    return response.json();
                }).then(function (response) {
                    channel.stream = response.stream;
                    callback();
                }).catch(function (ex) {
                    callback(ex);
                });
        }, function (err) {
            // TODO: log it
            if (err) { return; }

            // temporary dirty hack
            mainView.$delete('lastUpdateTime');
            mainView.$set('lastUpdateTime', Date.now());
            
            updatedTimeoutId = setTimeout(startStatusUpdater, 30 * 1000);
        });
    }
    
    function forceStatusUpdater() {
        if (updatedTimeoutId) clearTimeout(updatedTimeoutId);
        startStatusUpdater();
    }
    
    startStatusUpdater();
}
