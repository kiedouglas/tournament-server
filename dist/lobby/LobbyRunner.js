"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var randomWord = require("random-word");
var debug = require("debug")("sg:lobbyRunner");
var PubSub_1 = require("../lib/PubSub");
var events_1 = require("../socket/events");
var TournamentRunner_1 = require("./tournament/TournamentRunner");
var LobbyRunner = (function () {
    function LobbyRunner(admin) {
        var _this = this;
        this.addPlayerToLobby = function (data) {
            var player = data.player;
            var lobbyName = data.payload.token;
            var isSpectating = data.payload.spectating;
            if (lobbyName !== _this.lobby.token) {
                return;
            }
            if (_this.lobby.bannedPlayers.indexOf(player) > -1) {
                return;
            }
            if (!isSpectating && _this.lobby.players.indexOf(player) < 0) {
                _this.lobby.players.push(player);
            }
            var lobby = _this.getLobby();
            _this.pubSub.publish(events_1.EVENTS.ADD_PLAYER_TO_NAMESPACE, {
                namespace: lobbyName,
                player: player
            });
            _this.pubSub.publish(events_1.EVENTS.BROADCAST_NAMESPACED, {
                event: "connected",
                namespace: lobbyName,
                payload: {
                    lobby: lobby
                }
            });
            _this.pubSub.publish(events_1.EVENTS.SERVER_TO_PLAYER, {
                event: "lobby joined",
                payload: {
                    isAdmin: _this.lobby.admin === player,
                    lobby: lobby
                },
                player: player
            });
            if (isSpectating) {
                _this.pubSub.publish(events_1.EVENTS.ADD_PLAYER_TO_NAMESPACE, {
                    namespace: lobbyName + "-info",
                    player: player
                });
            }
            debug("Added player %s to lobby %s", player, lobbyName);
        };
        this.ifAdmin = function (next) { return function (data) {
            var lobbyName = data.payload.token;
            if (data.player !== _this.lobby.admin || lobbyName !== _this.lobby.token) {
                return;
            }
            next(lobbyName, data);
        }; };
        this.startTournament = this.ifAdmin(function (lobbyName, data) {
            _this.tournamentRunner = new TournamentRunner_1.TournamentRunner(data.payload.options, _this.lobby.players, _this.lobby.token);
            debug("Starting tournament in lobby %s", lobbyName);
            _this.tournamentRunner.start();
        });
        this.continueTournament = this.ifAdmin(function (lobbyName) {
            _this.tournamentRunner["continue"]();
            debug("Continue tournament in lobby %s", lobbyName);
            _this.pubSub.publish(events_1.EVENTS.BROADCAST_NAMESPACED, {
                event: "lobby tournament continued",
                namespace: lobbyName,
                payload: _this.getLobby()
            });
        });
        this.kickPlayer = this.ifAdmin(function (lobbyName, data) {
            var playerIndex = _this.lobby.players.indexOf(data.player);
            _this.lobby.players.splice(playerIndex, 1);
            debug("Kick player %s in lobby %s", data.player, lobbyName);
            _this.pubSub.publish(events_1.EVENTS.BROADCAST_NAMESPACED, {
                event: "lobby player kicked",
                namespace: lobbyName,
                payload: _this.getLobby()
            });
            _this.pubSub.publish(events_1.EVENTS.SERVER_TO_PLAYER, {
                event: "kicked",
                payload: null,
                player: data.player
            });
        });
        this.banPlayer = this.ifAdmin(function (lobbyName, data) {
            var playerIndex = _this.lobby.players.indexOf(data.player);
            _this.lobby.players.splice(playerIndex, 1);
            if (_this.lobby.bannedPlayers.indexOf(data.player) > -1) {
                return;
            }
            _this.lobby.bannedPlayers.push(data.player);
            debug("Ban player %s in lobby %s", data.player, lobbyName);
            _this.pubSub.publish(events_1.EVENTS.BROADCAST_NAMESPACED, {
                event: "lobby player banned",
                namespace: lobbyName,
                payload: _this.getLobby()
            });
            _this.pubSub.publish(events_1.EVENTS.SERVER_TO_PLAYER, {
                event: "banned",
                payload: null,
                player: data.player
            });
        });
        this.lobby = {
            admin: admin,
            bannedPlayers: [],
            players: [],
            token: randomWord() + "-" + randomWord()
        };
        this.pubSub = new PubSub_1["default"]();
        this.pubSub.subscribe(events_1.EVENTS.LOBBY_JOIN, this.addPlayerToLobby);
        this.pubSub.subscribe(events_1.EVENTS.LOBBY_TOURNAMENT_START, this.startTournament);
        this.pubSub.subscribe(events_1.EVENTS.LOBBY_TOURNAMENT_CONTINUE, this.continueTournament);
        this.pubSub.subscribe(events_1.EVENTS.LOBBY_PLAYER_BAN, this.banPlayer);
        this.pubSub.subscribe(events_1.EVENTS.LOBBY_PLAYER_KICK, this.kickPlayer);
    }
    LobbyRunner.prototype.getLobby = function () {
        var tournament = this.tournamentRunner ? this.tournamentRunner.getTournament() : null;
        return __assign({ tournament: tournament }, this.lobby);
    };
    return LobbyRunner;
}());
exports.LobbyRunner = LobbyRunner;
//# sourceMappingURL=LobbyRunner.js.map