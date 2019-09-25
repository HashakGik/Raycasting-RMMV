//=============================================================================
// Maze.js
//=============================================================================

/*:
@plugindesc Simple raycasting engine which turns the game maps into 3D mazes.
@author Hash'ak'Gik

@param resume
@desc Resume string.
@default Resume

@param retry
@desc Retry string.
@default Retry

@param quit
@desc Quit string.
@default Quit

@param yes
@desc Yes string.
@default Yes

@param no
@desc No string.
@default No

@param quality
@desc Quality setting string.
@default Quality

@param low
@desc Low quality string.
@default Low

@param medium
@desc Medium quality string.
@default Medium

@param High
@desc High quality string.
@default High

@param auto
@desc Automatic quality string.
@default Auto

@param block_width
@desc Size of each 3D block.
@default 1

@param gen_floor
@desc Tile id for the generated maps' floor.
@default 2860

@param gen_wall
@desc Tile id for the generated maps' walls.
@default 6335

@param gen_tileset_id
@desc Tileset id for the generated maps.
@default 3

@help
This plugin generates a 3D maze from an existing map or randomly and can work in two different "modes":
- Normal mode: the maze is simply a different appearance of a game map (running events won't be stopped),
- Maze mode: the maze acts as a minigame which will pause any event until it's won ($mazeClear = true) or lost ($mazeClear = false).

Rendering quality:
Four quality settings are available from the menu (Automatic, Low, Medium and High).
Automatic quality will start at Medium and will:
- reduce quality quickly if the framerate drops below 20 fps,
- increase quality slowly if the framerate remains above 59 fps for a long enough time.
This behaviour guarantees smooth gameplay even in canvas mode.

Compass:
During 3D mode a compass is shown on screen, its needle will be attracted by some events (see section below),
with a pull proportional to their distance from the player (i.e. a close event will pull the compass more than a farther one).
Fake goals' pull can be configured (a true goal has a strength of 1, so a fake goal with strength = 0.5 will be half as strong as a true goal,
while a fake goal with strength = 2 will be twice as strong as a real goal).

Events notes:
<goal> The maze's compass will point towards this event, usually an event with this note should include the "Maze success" plugin command,
<fake:strength> The maze's compass will be interfered by this event with the specified strength (the event might include the "Maze fail" command).

Plugin commands:
Maze on [retry [quit]]
    Turns on the 3D effect without changing map (normal mode). Can enable/disable "retry" and "quit" options in the pause menu.
    For example: "Maze on false true" disables the retry option, but keeps the quit option enabled.
Maze off
    Turns off the 3D effect.
Maze toggle [retry [quit]]
    Toggles between on and off (normal mode).
Maze map id x y direction [retry [quit]]
    Turns on the 3D effect on a new map (maze mode). When quitting, the player will return to the previous map.
    For example: "Maze map 2 10 15 6" loads map 002 and places the player at coordinates 10,15 facing east (direction 6).
Maze generate n [retry [quit]]
    Randomly generates a map large 2 * n tiles and automatically places a single event as a goal (maze mode).
Maze success
    Turns off the 3D effect, returns the player to the previous map and sets $mazeClear to true.
Maze fail
    Turns off the 3D effect, returns the player to the previous map and sets $mazeClear to false (same as selecting "Quit" from the menu).
*/


/**
 * Stores the maze's success state.
 * True if the maze was escaped by triggering the right event, false if the maze was left from the pause menu or by triggering the wrong event.
 * @typedef $mazeClear
 * @type {boolean}
 */
var $mazeClear = false;

/**
 * @namespace Maze
 */
var Maze = (function (my) {

    var parameters = PluginManager.parameters('Maze');

    my.yes = String(parameters['yes'] || "Yes");
    my.no = String(parameters['no'] || "No");
    my.retry = String(parameters['retry'] || "Retry");
    my.quit = String(parameters['quit'] || "Quit");
    my.resume = String(parameters['resume'] || "Resume");
    my.quality = String(parameters['quality'] || "Quality");
    my.qLow = String(parameters['low'] || "Low");
    my.qMedium = String(parameters['medium'] || "Medium");
    my.qHigh = String(parameters['high'] || "High");
    my.qAuto = String(parameters['auto'] || "Auto");
    my.blockWidth = Number(parameters['block_width'] || 1);


    /**
     * Size of the generated maps. It will be set from plugin commands (must be >= 4).
     * @typedef genSize
     * @memberOf Maze
     */
    my.genSize = 0;
    /**
     * Tile id for the floor of generated maps.
     * @typedef genFloor
     * @memberOf Maze
     */
    my.genFloor = Number(parameters['gen_floor'] || 2860);
    /**
     * Tile id for the wall of generated maps.
     * @typedef genWall
     * @memberOf Maze
     */
    my.genWall = Number(parameters['gen_wall'] || 6335);
    /**
     * Tileset id for the generated maps.
     * @typedef genTilesetId
     * @memberOf Maze
     */
    my.genTilesetId = Number(parameters['gen_tileset_id'] || 3);

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'Maze') {
            switch (args[0]) {
                case "on":
                    if (!(SceneManager._scene instanceof my.Scene_Maze)) {
                        my.oldPosition = {
                            id: $gameMap._mapId,
                            x: $gamePlayer._x,
                            y: $gamePlayer._y,
                            direction: $gamePlayer._direction
                        };
                        my.isMaze = false;
                        if (args[1] === "false") {
                            my.canRetry = false;
                        }
                        else {
                            my.canRetry = true;
                        }
                        if (args[2] === "false") {
                            my.canQuit = false;
                        }
                        else {
                            my.canQuit = true;
                        }

                        SceneManager.goto(my.Scene_Maze);
                    }
                    break;
                case "off":
                    if (SceneManager._scene instanceof my.Scene_Maze) {
                        SceneManager.goto(Scene_Map);
                    }
                    break;
                case "toggle":
                    if (SceneManager._scene instanceof my.Scene_Maze) {
                        SceneManager.goto(Scene_Map);
                    }
                    else {
                        my.oldPosition = {
                            id: $gameMap._mapId,
                            x: $gamePlayer._x,
                            y: $gamePlayer._y,
                            direction: $gamePlayer._direction
                        };
                        my.isMaze = false;
                        if (args[1] === "false") {
                            my.canRetry = false;
                        }
                        else {
                            my.canRetry = true;
                        }
                        if (args[2] === "false") {
                            my.canQuit = false;
                        }
                        else {
                            my.canQuit = true;
                        }

                        SceneManager.goto(my.Scene_Maze);
                    }
                    break;
                case "map":
                    if (!(SceneManager._scene instanceof my.Scene_Maze)) {
                        my.isMaze = true;
                        my.oldPosition = {
                            id: $gameMap._mapId,
                            x: $gamePlayer._x,
                            y: $gamePlayer._y,
                            direction: $gamePlayer._direction
                        };
                        var id = Number(args[1]);
                        var x = Number(args[2]);
                        var y = Number(args[3]);
                        var dir = Number(args[4]);
                        $gamePlayer.reserveTransfer(id, x, y, dir, 2);

                        if (args[5] === "false") {
                            my.canRetry = false;
                        }
                        else {
                            my.canRetry = true;
                        }
                        if (args[6] === "false") {
                            my.canQuit = false;
                        }
                        else {
                            my.canQuit = true;
                        }

                        SceneManager.goto(my.Scene_Maze);
                    }
                    break;
                case "generate":
                    if (!(SceneManager._scene instanceof my.Scene_Maze)) {
                        my.isMaze = true;
                        my.oldPosition = {
                            id: $gameMap._mapId,
                            x: $gamePlayer._x,
                            y: $gamePlayer._y,
                            direction: $gamePlayer._direction
                        };

                        my.genSize = Math.max(Number(args[1]), 4);

                        $gamePlayer.reserveTransfer(-1, Math.floor(my.genSize / 2) * 2, Math.floor(my.genSize / 2) * 2, 2, 2);

                        if (args[2] === "false") {
                            my.canRetry = false;
                        }
                        else {
                            my.canRetry = true;
                        }
                        if (args[3] === "false") {
                            my.canQuit = false;
                        }
                        else {
                            my.canQuit = true;
                        }

                        SceneManager.goto(my.Scene_Maze);
                    }
                    break;
                case "success":
                    if (SceneManager._scene instanceof my.Scene_Maze) {
                        $mazeClear = true;
                        if (my.isMaze) {
                            $gamePlayer.reserveTransfer(my.oldPosition.id, my.oldPosition.x, my.oldPosition.y, my.oldPosition.direction, 2);
                        }
                        SceneManager.goto(Scene_Map);
                    }
                    break;
                case "fail":
                    if (SceneManager._scene instanceof my.Scene_Maze) {
                        $mazeClear = false;
                        if (my.isMaze) {
                            $gamePlayer.reserveTransfer(my.oldPosition.id, my.oldPosition.x, my.oldPosition.y, my.oldPosition.direction, 2);
                        }
                        SceneManager.goto(Scene_Map);
                    }
                    break;
            }
        }
    };


    /**
     * Generates a random maze with a depth first algorithm ({@link https://en.wikipedia.org/wiki/Maze_generation_algorithm}). Since it's invoked by DataManager, its parameters must be passed with the variables:
     * {@link Maze.genSize}, {@link Maze.genFloor}, {@link Maze.genWall} and {@link Maze.genTilesetId}.
     *
     * @memberOf Maze
     */
    my.generateMaze = function () {
        var cells = new Array(my.genSize);
        for (var i = 0; i < my.genSize; i++) {
            cells[i] = new Array(my.genSize);
            cells[i].fill(false);
        }

        var maze = new Array(my.genSize * 2);
        for (var i = 0; i < my.genSize * 2; i++) {
            maze[i] = new Array(my.genSize * 2);
            maze[i].fill(false);
        }

        // Keep the initial position, for player's sake.
        var init = {x: Math.floor(my.genSize / 2) * 2, y: Math.floor(my.genSize / 2) * 2};

        // Start from the initial position and mark the cell as visited.
        var current = {x: Math.floor(my.genSize / 2), y: Math.floor(my.genSize / 2)};
        cells[current.x][current.y] = true;

        var unvisited = my.genSize * my.genSize - 1;
        var stack = [];
        var neighbours = [];

        do {
            unvisited = 0;
            for (var i = 0; i < my.genSize; i++) {
                unvisited += cells[i].filter(c => {
                    return !c;
                }).length;
            }

            neighbours = [
                {x: current.x - 1, y: current.y},
                {x: current.x + 1, y: current.y},
                {x: current.x, y: current.y - 1},
                {x: current.x, y: current.y + 1}
            ].filter(c => {
                return c.x > 0 && c.x < my.genSize - 1 && c.y > 0 && c.y < my.genSize - 1 &&
                    !cells[c.x][c.y];
            });
            
            // Pick a random neighbour.
            if (neighbours.length > 0) {
                var k = Math.floor(Math.random() * neighbours.length);
                stack.push({x: current.x, y: current.y});

                // Remove the wall between the current node and the selected neighbour.
                maze[2 * current.x][2 * current.y] = true;
                if (neighbours[k].x === current.x) {
                    if (neighbours[k].y === current.y + 1) {
                        maze[2 * current.x][2 * current.y + 1] = true;
                    }
                    else if (neighbours[k].y === current.y - 1) {
                        maze[2 * current.x][2 * current.y - 1] = true;
                    }
                }
                else if (neighbours[k].y === current.y) {
                    if (neighbours[k].x === current.x + 1) {
                        maze[2 * current.x + 1][2 * current.y] = true;
                    }
                    else if (neighbours[k].x === current.x - 1) {
                        maze[2 * current.x - 1][2 * current.y] = true;
                    }
                }

                // Mark the current cell as visited and move to the selected neighbour.
                current = {x: neighbours[k].x, y: neighbours[k].y};
                cells[current.x][current.y] = true;

            }
            else if (stack.length > 0) { // If there are no available neighbours, backtrack to previously visited cells.
                current = stack.pop();
            }
        } while (unvisited > 0 && !(neighbours.length === 0 && stack.length === 0));
        // Repeat as long as there are unvisited cells and there is at least one cell with available neighbours.

        // Generate two events (the event with ID 0 on a map is always null, the other one will trigger a "Maze success" command).
        $dataMap.events.push(null);
        var ev;

        // If the plugin was called from an event on map, there will be at least one event with the locked flag set.
        // The maze's goal will have the same appearance of the calling event.
        if ($gameMap._events.filter(e => {
            return e != null && e._locked;
        }).length > 0) {
            ev = $gameMap._events.filter(e => {
                return e != null && e._locked;
            })[0].event();

            ev.id = 1;
            ev.note = "<goal>";
            ev.pages[0].through = false;
            ev.pages[0].trigger = 0;
            ev.pages[0].directionFix = true;
            ev.pages[0].image.direction = 2;
            ev.pages[0].list = [
                {
                    "code": 356,
                    "indent": 0,
                    "parameters": [
                        "Maze success"
                    ]
                },
                {
                    "code": 0,
                    "indent": 0,
                    "parameters": []
                }
            ];
        }
        else { // Otherwise, the goal will have a dummy "Actor1" appearance.
            console.warn("Invoking event not found. Creating dummy event.");
            ev = {
                "id": 1,
                "name": "EV001",
                "note": "<goal>",
                "pages": [{
                    "conditions": {
                        "actorId": 1,
                        "actorValid": false,
                        "itemId": 1,
                        "itemValid": false,
                        "selfSwitchCh": "A",
                        "selfSwitchValid": false,
                        "switch1Id": 1,
                        "switch1Valid": false,
                        "switch2Id": 1,
                        "switch2Valid": false,
                        "variableId": 1,
                        "variableValid": false,
                        "variableValue": 0
                    },
                    "directionFix": true,
                    "image": {
                        "tileId": 0,
                        "characterName": "Actor1",
                        "direction": 2,
                        "pattern": 0,
                        "characterIndex": 0
                    },
                    "list": [
                        {
                            "code": 356,
                            "indent": 0,
                            "parameters": [
                                "Maze success"
                            ]
                        },
                        {
                            "code": 0,
                            "indent": 0,
                            "parameters": []
                        }
                    ],
                    "moveFrequency": 3,
                    "moveRoute": {
                        "list": [{"code": 0, "parameters": []}],
                        "repeat": true,
                        "skippable": false,
                        "wait": false
                    },
                    "moveSpeed": 3,
                    "moveType": 0,
                    "priorityType": 1,
                    "stepAnime": true,
                    "through": false,
                    "trigger": 0,
                    "walkAnime": true
                }],
                "x": 0,
                "y": 0
            };
        }


        // Write $dataMap with the generated maze and events.
        $dataMap = {};
        $dataMap.events = [];

        $dataMap.width = maze.length;
        $dataMap.height = maze[0].length;
        $dataMap.scrollType = 0;
        $dataMap.tilesetId = my.genTilesetId;

        var width = maze.length;
        var height = maze[0].length;


        $dataMap.data = new Array(6 * width * height);
        $dataMap.data.fill(0);

        // Fill the map's data structure, while keeping track of the walkable tiles.
        var goals = [];
        for (var i = 0; i < width; i++) {
            for (var j = 0; j < height; j++) {
                if (maze[i][j]) {
                    $dataMap.data[i + j * width] = my.genFloor;
                    if (i !== init.x && j !== init.y) {
                        goals.push({x: i, y: j});
                    }
                }
                else {
                    $dataMap.data[i + j * width] = my.genWall;
                }
            }
        }

        // From any of the walkable tiles, choose randomly a goal position.
        var goal = goals[Math.floor(Math.random() * goals.length)];


        // Set the goal event's position.
        ev.x = goal.x;
        ev.y = goal.y;
        $dataMap.events.push(ev);
    };


    var _loadMapData = DataManager.loadMapData;
    /**
     * Overrides the default DataManager.loadMapData method.
     * @param mapId if -1 generates a random maze, otherwise it keeps the default behaviour.
     */
    DataManager.loadMapData = function (mapId) {
        if (mapId === -1) {
            my.generateMaze();
        }
        else {
            _loadMapData.call(this, mapId);
        }
    };

    // Rewrite Input._updateGamepadState to include axes informations and whether the last input came from a gamepad or the keyboard.
    Input._updateGamepadState = function(gamepad) {
        var lastState = this._gamepadStates[gamepad.index] || [];
        var newState = [];
        var buttons = gamepad.buttons;
        var axes = gamepad.axes;
        var threshold = 0.5;
        newState[12] = false;
        newState[13] = false;
        newState[14] = false;
        newState[15] = false;
        for (var i = 0; i < buttons.length; i++) {
            newState[i] = buttons[i].pressed;
        }
        if (axes[1] < -threshold) {
            newState[12] = true;    // up
        } else if (axes[1] > threshold) {
            newState[13] = true;    // down
        }
        if (axes[0] < -threshold) {
            newState[14] = true;    // left
        } else if (axes[0] > threshold) {
            newState[15] = true;    // right
        }
        for (var j = 0; j < newState.length; j++) {
            if (newState[j] !== lastState[j]) {
                var buttonName = this.gamepadMapper[j];
                if (buttonName) {
                    this._currentState[buttonName] = newState[j];
                }
            }
        }
        this._gamepadStates[gamepad.index] = newState;
        this._axes = gamepad.axes;

        this._lastInputIsGamepad = newState.filter(b => {return b === true;}).length > 0;
    };

    // Rewrite Input._onKeyDown to include whether the last input came from a gamepad or the keyboard.
    Input._onKeyDown = function(event) {
        if (this._shouldPreventDefault(event.keyCode)) {
            event.preventDefault();
        }
        if (event.keyCode === 144) {    // Numlock
            this.clear();
        }
        var buttonName = this.keyMapper[event.keyCode];
        if (ResourceHandler.exists() && buttonName === 'ok') {
            ResourceHandler.retry();
        } else if (buttonName) {
            this._currentState[buttonName] = true;
        }
        this._lastInputIsGamepad = false;
    };

    // Checks where the last input came from.
    Input.isLastInputGamepad = function() {
        return !!this._lastInputIsGamepad;
    };

    // Returns the value for a given axis. If the value is below the deadzone it returns 0.
    Input.readAxis = function(axis, deadzone = 0.20) {
        var ret = 0;
        if (this._axes && Math.abs(this._axes[axis]) >= deadzone) {
            ret = this._axes[axis];
        }
        return ret;
    };

    var _ti_onTouchMove = TouchInput._onTouchMove;
    TouchInput._onTouchMove = function(event) {
        var oldX = this._x;
        var oldY = this._y;
        _ti_onTouchMove.call(this, event);

        this._dx = this._x - oldX;
        this._dy = this._y - oldY;
    };

    TouchInput.isLastInputTouch = function() {
        return this._screenPressed;
    };

    Object.defineProperty(TouchInput, 'dx', {
        get: function() {
            return this._dx;
        },
        configurable: true
    });

    Object.defineProperty(TouchInput, 'dy', {
        get: function() {
            return this._dy;
        },
        configurable: true
    });

    return my;
}(Maze || {}));

var Maze = (function (my) {

    /**
     * Controller class for the 3D maze. It handles events' and player's movements, and the compass.
     *
     * @constructor
     * @memberOf Maze
     */
    var Maze_Controller = my.Maze_Controller = function () {
        this.initialize.apply(this, arguments);
    };

    Maze_Controller.prototype = Object.create(Object.prototype);
    Maze_Controller.prototype.constructor = Maze_Controller;

    /**
     * Creates player and events.
     *
     * @param cameraDistance Player's camera distance.
     * @param cameraWidth Player's camera width.
     * @param speed Player's speed.
     * @param rotationSpeed Player's rotation speed.
     */
    Maze_Controller.prototype.initialize = function (cameraDistance, cameraWidth, speed, rotationSpeed) {
        my.player = new my.Maze_Player(cameraDistance, cameraWidth, speed, rotationSpeed);

        this.initX = $gamePlayer._x;
        this.initY = $gamePlayer._y;
        this.initDir = $gamePlayer._direction;
        this.cameraDistance = cameraDistance;
        this.cameraWidth = cameraWidth;

        this.paused = false;
        this.compassDir = 0;

        $mazeClear = false;

        this.createEvents();
    };

    /**
     * Creates maze events from $gameMap's events.
     */
    Maze_Controller.prototype.createEvents = function () {
        this.events = [];
        $gameMap.events().forEach(e => {
            var tmp = new my.Maze_Event(e);
            tmp.goal = (e.event().note === "<goal>");

            var regex = /<fake:(\d+(?:\.(?:\d+))?)>/;
            var grps = regex.exec(e.event().note);
            if (grps != null) {
                tmp.fake = true;
                tmp.strength = Number(grps[1]);
            }
            else {
                tmp.fake = false;
            }

            this.events.push(tmp);
        });

    };

    /**
     * Checks if a position is occupied.
     * @param x Not used, reserved for future use.
     * @param y Not used, reserved for future use.
     * @param tileX X coordinate (in Game_Map coordinate system) to check.
     * @param tileY Y coordinate (in Game_Map coordinate system) to check.
     * @returns {boolean} True if the position is passable.
     */
    Maze_Controller.prototype.checkPassage = function (x, y, tileX, tileY) {
        var ret = this.events.filter(e => {
           return e.tileX === tileX && e.tileY === tileY && !e.event.page().through;
        }).length === 0;
        ret &= $gameMap.checkPassage(tileX, tileY, 0x0f);
        ret &= tileX >= 0 && tileX < $gameMap.width();
        ret &= tileY >= 0 && tileY < $gameMap.height();

        return ret;
    };

    /**
     * Updates player, events and compass direction.
     * The compass will point to the vector sum of each <goal> and <fake> events' pull.
     *
     * An event's pull on the compass is calculated as its strength (goal events have strength set to 1) divided by
     * the square of the distance from the player (i.e. closer events will exert a stronger pull).
     */
    Maze_Controller.prototype.update = function () {

        var midX = 0;
        var midY = 0;
        var weight = 0;
        var distance = 0;
        var tmpX;
        var tmpY;

        this.events.forEach(e => {
            e.update();

            if (e.goal) {
                distance = (my.player.x - e.x) * (my.player.x - e.x) + (my.player.y - e.y) * (my.player.y - e.y);
                midX += e.x / distance;
                midY += e.y / distance;


                weight += 1 / distance;
            }
            else if (e.fake) {
                distance = (my.player.x - e.x) * (my.player.x - e.x) + (my.player.y - e.y) * (my.player.y - e.y);
                midX += e.x * e.strength / distance;
                midY += e.y * e.strength / distance;

                weight += e.strength / distance;


            }
        });

        // Sorts the events by distance, for drawing's sake (they must be drawn from farthest to closest).
        this.events.sort((e0, e1) => {
            return e1.distance - e0.distance;
        });

        var dx = my.player.x - midX / weight;
        var dy = my.player.y - midY / weight;

        this.compassDir = Math.atan2(dy, dx) - my.player.direction;
        if (this.compassDir < 0) {
            this.compassDir += 2 * Math.PI;
        }
        if (this.compassDir >= 2 * Math.PI) {
            this.compassDir -= 2 * Math.PI;
        }
    };

    /**
     * Resets the maze.
     */
    Maze_Controller.prototype.reset = function () {
        my.player.goto(this.initX, this.initY, this.initDir);
        this.createEvents();

        this.paused = false;
    };

    /**
     * Draws a compass.
     * @param bitmap Bitmap on which the compass will be drawn.
     * @param x Compass center's x coordinate.
     * @param y Compass center's y coordinate.
     * @param radius Compass radius.
     * @param bgColor Background color of the compass.
     * @param pointingColor Color of the half needle pointing the destination.
     * @param opposingColor Color of the half needle opposite to the destination.
     */
    Maze_Controller.prototype.drawCompass = function (bitmap, x, y, radius, bgColor, pointingColor, opposingColor) {
        bitmap._context.fillStyle = bgColor;
        bitmap._context.beginPath();
        bitmap._context.arc(x, y, radius, 0, 2 * Math.PI, false);
        bitmap._context.closePath();
        bitmap._context.fill();
        bitmap._context.beginPath();
        bitmap._context.fillStyle = pointingColor;
        bitmap._context.moveTo(x + Math.cos(this.compassDir + Math.PI / 2) * radius * 0.75, y + Math.sin(this.compassDir + Math.PI / 2) * radius * 0.75);
        bitmap._context.lineTo(x + Math.cos(this.compassDir) * radius * 0.1, y + Math.sin(this.compassDir) * radius * 0.1);
        bitmap._context.lineTo(x - Math.cos(this.compassDir) * radius * 0.1, y - Math.sin(this.compassDir) * radius * 0.1);
        bitmap._context.closePath();
        bitmap._context.fill();
        bitmap._context.beginPath();
        bitmap._context.fillStyle = opposingColor;
        bitmap._context.moveTo(x + Math.cos(this.compassDir - Math.PI / 2) * radius * 0.75, y + Math.sin(this.compassDir - Math.PI / 2) * radius * 0.75);
        bitmap._context.lineTo(x + Math.cos(this.compassDir) * radius * 0.1, y + Math.sin(this.compassDir) * radius * 0.1);
        bitmap._context.lineTo(x - Math.cos(this.compassDir) * radius * 0.1, y - Math.sin(this.compassDir) * radius * 0.1);
        bitmap._context.closePath();
        bitmap._context.fill();
    };

    return my;
}(Maze || {}));

var Maze = (function (my) {

    /**
     * Event class. Wraps a Game_Event in order to correctly display it on screen.
     * @constructor
     * @memberOf Maze
     */
    var Maze_Event = my.Maze_Event = function () {
        this.initialize.apply(this, arguments);
    };

    Maze_Event.prototype = Object.create(Object.prototype);
    Maze_Event.prototype.constructor = Maze_Event;

    /**
     * Constructor. Initialises the event's image, distance and angle from the player.
     *
     * @param event Game_Event to be wrapped.
     */
    Maze_Event.prototype.initialize = function (event) {
        this.event = event;

        this.tileX = event.event().x;
        this.tileY = event.event().y;

        this.x = this.tileX * my.blockWidth + my.blockWidth / 2;
        this.y = this.tileY * my.blockWidth + my.blockWidth / 2;

        this.distance = 100;
        this.angle = 0;

        this.characterName = event._characterName;
        this.bitmap = ImageManager.loadCharacter(this.event._characterName);

        this.patternX = this.event.pattern();
        this.mapPatternY = (this.event._direction - 2) / 2;
        this.patternY = this.mapPatternY;

        if (ImageManager.isBigCharacter(this.event._characterName)) {
            this.bigCharacter = true;
            this.width = this.bitmap.width / 3;
            this.height = this.bitmap.height / 4;
            this.blockX = 0;
            this.blockY = 0;
        } else {
            this.bigCharacter = false;
            this.width = this.bitmap.width / 12;
            this.height = this.bitmap.height / 8;
            this.blockX = this.event._characterIndex % 4 * 3;
            this.blockY = Math.floor(this.event._characterIndex / 4) * 4;
        }
    };

    /**
     * Update method. It recalculates the position (based on the Game_Event's position) and chooses which side of the event the player will see.
     * The direction fixed flag is not used in the same way as Scene_Map (if true the event won't turn to face the player when triggered),
     * instead it's used to determine whether or not the player sees the same direction when viewing the event from a different angle.
     */
    Maze_Event.prototype.update = function () {
        this.x = this.event._realX * my.blockWidth + my.blockWidth / 2;
        this.y = this.event._realY * my.blockWidth + my.blockWidth / 2;
        this.tileX = this.event._x;
        this.tileY = this.event._y;

        if (this.characterName !== this.event._characterName) {
            this.characterName = this.event._characterName;
            this.bitmap = ImageManager.loadCharacter(this.event._characterName);
        }

        this.patternX = this.event.pattern();
        this.mapPatternY = (this.event._direction - 2) / 2;
        this.patternY = this.mapPatternY;

        if (this.bigCharacter) {
            this.width = this.bitmap.width / 3;
            this.height = this.bitmap.height / 4;
            this.blockX = 0;
            this.blockY = 0;
        } else {
            this.width = this.bitmap.width / 12;
            this.height = this.bitmap.height / 8;
            this.blockX = this.event._characterIndex % 4 * 3;
            this.blockY = Math.floor(this.event._characterIndex / 4) * 4;
        }

        var dx = this.x - my.player.x;
        var dy = this.y - my.player.y;

        this.angle = Math.atan2(dy, dx);

        if (this.angle < 0) {
            this.angle += 2 * Math.PI;
        }

        if (!this.event.isDirectionFixed()) {
            switch (this.mapPatternY) {
                case 0:
                    if (this.angle > 5 * Math.PI / 4 && this.angle <= 7 * Math.PI / 4) {
                        this.patternY = 0;
                    }
                    else if (this.angle > 3 * Math.PI / 4 && this.angle <= 5 * Math.PI / 4) {
                        this.patternY = 1;
                    }
                    else if (this.angle > Math.PI / 4 && this.angle < 3 * Math.PI / 4) {
                        this.patternY = 3;
                    }
                    else if (this.angle > 7 * Math.PI / 4 || this.angle <= Math.PI / 4) {
                        this.patternY = 2;
                    }
                    break;
                case 1:
                    if (this.angle > 5 * Math.PI / 4 && this.angle <= 7 * Math.PI / 4) {
                        this.patternY = 1;
                    }
                    else if (this.angle > 3 * Math.PI / 4 && this.angle <= 5 * Math.PI / 4) {
                        this.patternY = 3;
                    }
                    else if (this.angle > Math.PI / 4 && this.angle < 3 * Math.PI / 4) {
                        this.patternY = 2;
                    }
                    else if (this.angle > 7 * Math.PI / 4 || this.angle <= Math.PI / 4) {
                        this.patternY = 0;
                    }
                    break;
                case 2:
                    if (this.angle > 5 * Math.PI / 4 && this.angle <= 7 * Math.PI / 4) {
                        this.patternY = 2;
                    }
                    else if (this.angle > 3 * Math.PI / 4 && this.angle <= 5 * Math.PI / 4) {
                        this.patternY = 0;
                    }
                    else if (this.angle > Math.PI / 4 && this.angle < 3 * Math.PI / 4) {
                        this.patternY = 1;
                    }
                    else if (this.angle > 7 * Math.PI / 4 || this.angle <= Math.PI / 4) {
                        this.patternY = 3;
                    }
                    break;
                case 3:
                    if (this.angle > 5 * Math.PI / 4 && this.angle <= 7 * Math.PI / 4) {
                        this.patternY = 3;
                    }
                    else if (this.angle > 3 * Math.PI / 4 && this.angle <= 5 * Math.PI / 4) {
                        this.patternY = 2;
                    }
                    else if (this.angle > Math.PI / 4 && this.angle < 3 * Math.PI / 4) {
                        this.patternY = 0;
                    }
                    else if (this.angle > 7 * Math.PI / 4 || this.angle <= Math.PI / 4) {
                        this.patternY = 1;
                    }
                    break;
            }
        }

        this.distance = Math.sqrt(dx * dx + dy * dy);
    };

    /**
     * Draws the sprite, one vertical line at the time. A Z buffer is used to determine whether part of the sprite is hidden by a wall.
     * This.distance is used to properly scale the sprite.
     *
     * @param bitmap Bitmap on which the sprite will be drawn.
     * @param zBuffer Array of distances. A line will be drawn only if it's closer than the value stored on the buffer.
     * @param scaleFactor If other than 1, the sprite will be resized.
     * @param a Initial angle of the player's field of view.
     * @param b Final angle of the player's field of view.
     */
    Maze_Event.prototype.draw3D = function (bitmap, zBuffer, scaleFactor, a, b) {
        if (this.distance !== 0) {
            var spriteAngle = this.angle - a;

            // Fixes the sprite's angle when its center is outside the screen AND when a is above the 0 rad axis and b is below.
            if (spriteAngle < 0 && b > 2 * Math.PI) {
                spriteAngle += 2 * Math.PI;
            }

            var spriteX = bitmap.width * spriteAngle / (b - a);
            var height = Math.floor(bitmap.height * this.height / $gameMap.tileHeight() / this.distance);

            // If the player is too close, limit the for loop iterations, without sacrificing appearance.
            if (height > bitmap.height * 4) {
                height = bitmap.height * 4;
            }
            var width = Math.floor(height * this.width / this.height);
            var y0 = (bitmap.height - height) / 2;

            var pw = this.width;
            var ph = this.height;
            var sx = (this.blockX + this.patternX) * pw;
            var sy = (this.blockY + this.patternY) * ph;

            var dw = pw / width;

            if (spriteX + width / 2 >= 0 && spriteX - width / 2 < bitmap.width) {
                for (var i = 0; i < width; i += scaleFactor) {
                    var x = spriteX + i - width / 2;

                    if (this.distance < zBuffer[Math.floor(x / scaleFactor)]) {
                        bitmap.blt(this.bitmap, sx + i * dw, sy, dw, ph, x, y0, scaleFactor, height);
                    }
                }
            }
        }
    };

    return my;
}(Maze || {}));

var Maze = (function (my) {

    /**
     * Player class for the 3D mazes. At each movement synchronises $gamePlayer.
     * @constructor
     * @memberOf Maze
     */
    var Maze_Player = my.Maze_Player = function() {
      this.initialize.apply(this, arguments);
    };

    Maze_Player.prototype = Object.create(Object.prototype);
    Maze_Player.prototype.constructor = Maze_Player;

    /**
     * Constructor. Initializes the player parameters and the raycaster's camera.
     *
     * @param cameraDistance Camera distance from the player.
     * @param cameraWidth Camera plane width.
     * @param speed Player's speed.
     * @param rotationSpeed Player's rotation speed.
     */
    Maze_Player.prototype.initialize = function(cameraDistance, cameraWidth, speed, rotationSpeed) {
        this.cameraDistance = cameraDistance;
        this.cameraWidth = cameraWidth;
        this.speed = speed;
        this.rotationSpeed = rotationSpeed;

        this.goto($gamePlayer._x, $gamePlayer._y, $gamePlayer._direction);

    };

    /**
     * Teleports the player.
     * @param x X coordinate of the destination.
     * @param y Y coordinate of the destination.
     * @param direction Direction (2-4-6-8) to be faced.
     */
    Maze_Player.prototype.goto = function(x, y, direction) {

        this.x = x * my.blockWidth + my.blockWidth / 2;
        this.y = y * my.blockWidth + my.blockWidth / 2;
        this.tileX = x;
        this.tileY = y;


        switch(direction) {
            case 2:
                this.direction = Math.PI / 2;
                break;
            case 4:
                this.direction = Math.PI;
                break;
            case 6:
                this.direction = 0;
                break;
            case 8:
                this.direction = 3 * Math.PI / 2;
                break;
        }

        this.update();
    };

    /**
     * Rotates the player counterclockwise.
     */
    Maze_Player.prototype.rotateLeft = function() {
        this.direction -= this.rotationSpeed;

        if (this.direction < 0) {
            this.direction += 2 * Math.PI;
        }

        this.update();
    };

    /**
     * Rotates the player clockwise.
     */
    Maze_Player.prototype.rotateRight = function() {
        this.direction += this.rotationSpeed;

        if (this.direction >= 2 * Math.PI) {
            this.direction -= 2 * Math.PI;
        }

        this.update();
    };

    /**
     * Makes the player step sideways to the left.
     */
    Maze_Player.prototype.strafeLeft = function() {
        var destX = this.x + Math.cos(this.direction - Math.PI / 2) * this.speed;
        var destY = this.y + Math.sin(this.direction - Math.PI / 2) * this.speed;
        var destTileX = Math.floor(destX / my.blockWidth);
        var destTileY = Math.floor(destY / my.blockWidth);


        if (my.controller.checkPassage(destX, destY, destTileX, destTileY)) {
            this.x = destX;
            this.y = destY;
            this.tileX = destTileX;
            this.tileY = destTileY;
        }

        this.update();
    };

    /**
     * Makes the player step sideways to the right.
     */
    Maze_Player.prototype.strafeRight = function() {
        var destX = this.x + Math.cos(this.direction + Math.PI / 2) * this.speed;
        var destY = this.y + Math.sin(this.direction + Math.PI / 2) * this.speed;
        var destTileX = Math.floor(destX / my.blockWidth);
        var destTileY = Math.floor(destY / my.blockWidth);


        if (my.controller.checkPassage(destX, destY, destTileX, destTileY)) {
            this.x = destX;
            this.y = destY;
            this.tileX = destTileX;
            this.tileY = destTileY;
        }

        this.update();
    };

    /**
     * Makes the player step forward.
     */
    Maze_Player.prototype.moveForward = function() {
        var destX = this.x + Math.cos(this.direction) * this.speed;
        var destY = this.y + Math.sin(this.direction) * this.speed;
        var destTileX = Math.floor(destX / my.blockWidth);
        var destTileY = Math.floor(destY / my.blockWidth);


        if (my.controller.checkPassage(destX, destY, destTileX, destTileY)) {
            this.x = destX;
            this.y = destY;
            this.tileX = destTileX;
            this.tileY = destTileY;
        }

        this.update();
    };

    /**
     * Makes the player step backward.
     */
    Maze_Player.prototype.moveBackward = function() {
        var destX = this.x + Math.cos(this.direction + Math.PI) * this.speed;
        var destY = this.y + Math.sin(this.direction + Math.PI) * this.speed;
        var destTileX = Math.floor(destX / my.blockWidth);
        var destTileY = Math.floor(destY / my.blockWidth);


        if (my.controller.checkPassage(destX, destY, destTileX, destTileY)) {
            this.x = destX;
            this.y = destY;
            this.tileX = destTileX;
            this.tileY = destTileY;
        }

        this.update();
    };

    /**
     * Synchronises $gamePlayer with the maze player.
     */
    Maze_Player.prototype.update = function() {
        $gamePlayer._realX = this.x;
        $gamePlayer._realY = this.y;
        $gamePlayer._x = this.tileX;
        $gamePlayer._y = this.tileY;

        if (this.direction > 5 * Math.PI / 4 && this.direction <= 7 * Math.PI / 4) {
            $gamePlayer._direction = 8;
        }
        else if (this.direction > 3 * Math.PI / 4 && this.direction <= 5 * Math.PI / 4) {
            $gamePlayer._direction = 4;
        }
        else if (this.direction > Math.PI / 4 && this.direction < 3 * Math.PI / 4) {
            $gamePlayer._direction = 2;
        }
        else if (this.direction > 7 * Math.PI / 4 || this.direction <= Math.PI / 4) {
            $gamePlayer._direction = 6;
        }
    };

    return my;
}(Maze || {}));

var Maze = (function (my) {

    /**
     * Ray caster class. Casts a cone of rays from the player to the closest obstacle and uses the distance to draw a block based 3D maze.
     * @constructor
     * @memberOf Maze
     */
    var Maze_Raycaster = my.Maze_Raycaster = function () {
        this.initialize.apply(this, arguments);
    };

    Maze_Raycaster.prototype = Object.create(Object.prototype);
    Maze_Raycaster.prototype.constructor = Maze_Raycaster;

    /**
     * Initializes the rayscaster.
     * @param screenSprite Bitmap on which the scene will be drawn.
     * @param scaleFactor Scale factor for framerate adjustement.
     * @param auto If true, the scale factor will automatically change to keep an high framerate.
     */
    Maze_Raycaster.prototype.initialize = function (screenSprite, scaleFactor, auto) {
        this.screenSprite = screenSprite;
        this.scaleFactor = scaleFactor;
        this.auto = auto;

        this.tileWidth = $gameMap.tileWidth();
        this.tileHeight = $gameMap.tileHeight();
        this.zBuffer = Array(this.screenSprite.width);
    };

    Maze_Raycaster.prototype.setQuality = function (scaleFactor, auto) {
        this.scaleFactor = scaleFactor;
        this.auto = auto;
    };

    /**
     * Adjusts the rendering framerate by drawing smaller images scaled up.
     * A quality decrease is 10 times faster than increase and happens immediately, while a quality increase will wait for
     * the average FPS over a long period.
     */
    Maze_Raycaster.prototype.adjustFrameRate = function () {
        this.smoothFps = (this.smoothFps * 0.95 + Graphics._fpsMeter.fps * 0.05) || Graphics._fpsMeter.fps;

        // Decrease must be immediate, so it uses the unsmoothed value.
        if (Graphics._fpsMeter.fps < 20 && this.scaleFactor + 0.1 <= 4) {
            this.scaleFactor += 0.1;
        }
        // Increase should be slow, so it uses the smoothed value.
        else if (this.smoothFps > 59 && this.scaleFactor - 0.01 >= 1) {
            this.scaleFactor -= 0.01;

            // Reset the moving average
            this.smoothFps = 30;
        }

    };

    /**
     * Retrieves the wall texture for a tile.
     * @param x X coordinate of the tile on map.
     * @param y Y coordinate of the tile on map.
     * @returns {{bitmap: *, x: number, y: number}} Structure containing the bitmap and the offset for the chosen tile.
     */
    Maze_Raycaster.prototype.getTexture = function (x, y) {
        var ret;
        var tileId = $gameMap.tileId(x, y, 0);

        // If it's an autotile.
        if (Tilemap.isAutotile(tileId)) {
            var kind = Tilemap.getAutotileKind(tileId);
            var shape = Tilemap.getAutotileShape(tileId);
            var tx = kind % 8;
            var ty = Math.floor(kind / 8);
            var bx = 0;
            var by = 0;
            var setNumber = 0;

            if (Tilemap.isTileA1(tileId)) {
                setNumber = 0;
                if (kind === 0) {
                    bx = 0;
                    by = 0;
                } else if (kind === 1) {
                    bx = 0;
                    by = 3;
                } else if (kind === 2) {
                    bx = 6;
                    by = 0;
                } else if (kind === 3) {
                    bx = 6;
                    by = 3;
                } else {
                    bx = Math.floor(tx / 4) * 8;
                    by = ty * 6 + Math.floor(tx / 2) % 2 * 3;
                    bx += 6;
                    by += this.animationFrame % 3;
                }
            } else if (Tilemap.isTileA2(tileId)) {
                setNumber = 1;
                bx = tx * 2;
                by = (ty - 2) * 3;
            } else if (Tilemap.isTileA3(tileId)) {
                setNumber = 2;
                bx = tx * 2;
                by = (ty - 6) * 2;
            } else if (Tilemap.isTileA4(tileId)) {
                setNumber = 3;
                bx = tx * 2;
                by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
            }

            ret = {
                bitmap: my.bmps[setNumber],
                x: bx * this.tileWidth,
                y: by * this.tileHeight
            };

        }
        else { // If it's a normal tile.
            var setNumber = 0;

            if (Tilemap.isTileA5(tileId)) {
                setNumber = 4;
            } else {
                setNumber = 5 + Math.floor(tileId / 256);
            }

            var sx = (Math.floor(tileId / 128) % 2 * 8 + tileId % 8) * this.tileWidth;
            var sy = (Math.floor(tileId % 256 / 8) % 16) * this.tileHeight;

            ret = {
                bitmap: my.bmps[setNumber],
                x: sx,
                y: sy
            };
        }

        return ret;
    };


    /**
     * Draws the 3D scene.
     */
    Maze_Raycaster.prototype.draw = function () {
        var ray;

        if (this.auto) {
            this.adjustFrameRate();
        }

        for (var i = 0; i < Math.ceil(this.screenSprite.width / this.scaleFactor); i++) {

            ray = this.castRay(i * this.scaleFactor * 2 * my.player.cameraWidth / this.screenSprite.width - my.player.cameraWidth);
            this.drawVLine(ray, i);

            this.zBuffer[i] = ray.distance;
        }

        this.drawSprites();
    };

    /**
     * Determines the player's left and right viewing angles and draws the events at the appropriate position.
     */
    Maze_Raycaster.prototype.drawSprites = function () {
        var cameraX = my.player.x + Math.cos(my.player.direction) * my.player.cameraDistance;
        var cameraY = my.player.y + Math.sin(my.player.direction) * my.player.cameraDistance;
        var a = my.player.direction + Math.atan2(-my.player.cameraWidth, my.player.cameraDistance);
        var b = my.player.direction + Math.atan2(my.player.cameraWidth, my.player.cameraDistance);

        if (a < 0) {
            a += 2 * Math.PI;
        }
        else if (a >= 2 * Math.PI) {
            a -= 2 * Math.PI;
        }

        if (b < 0) {
            b += 2 * Math.PI;
        }
        else if (b >= 2 * Math.PI) {
            b -= 2 * Math.PI;
        }

        if (b < a) {
            b += 2 * Math.PI;
        }

        my.controller.events.forEach(e => {
            e.draw3D(this.screenSprite._bitmap, this.zBuffer, this.scaleFactor, a, b);
        });
    };

    /**
     * Draws a single slice of a wall, determining the correct texture to apply.
     * The east and west sides of the wall are drawn with a darker shadow.
     * @param ray Ray which has hit the wall.
     * @param cameraX On screen x coordinate of the wall.
     */
    Maze_Raycaster.prototype.drawVLine = function (ray, cameraX) {
        var height = Math.floor(this.screenSprite.height / ray.distance);
        var y0 = (this.screenSprite.height - height) / 2;
        var y1 = (this.screenSprite.height + height) / 2;
        var textureX;

        if (ray.side === "EW") {
            textureX = my.player.y + ray.distance * Math.sin(ray.direction);
        }
        else {
            textureX = my.player.x + ray.distance * Math.cos(ray.direction);
        }

        textureX -= Math.floor(textureX);
        textureX = Math.floor(textureX * this.tileWidth);

        if (ray.side === "EW" && Math.cos(ray.direction) > 0 || ray.side === "NS" && Math.sin(ray.direction) < 0) {
            textureX = this.tileWidth - textureX - 1;
        }

        var texture = this.getTexture(ray.tileX, ray.tileY);

        this.screenSprite._bitmap.blt(texture.bitmap, texture.x + textureX, texture.y, 1, this.tileHeight, Math.floor(cameraX * this.scaleFactor), y0, Math.ceil(this.scaleFactor), y1 - y0);

        if (ray.side === "EW") {
            this.screenSprite._bitmap._context.fillStyle = "rgba(0, 0, 0, 0.25)";
            this.screenSprite._bitmap._context.fillRect(Math.floor(cameraX * this.scaleFactor), y0, this.scaleFactor, y1 - y0);
        }
    };

    /**
     * Casts a ray from the player until it hits a wall.
     * @param cameraX On screen x coordinate of the ray.
     * @returns {{distance: number, side: string, tileX: *, tileY: *, direction: *}} Ray data structure, contains the coordinates of the wall hit, its side and distance and direction from the player.
     */
    Maze_Raycaster.prototype.castRay = function (cameraX) {
        var distance = 0;

        var rayX = my.player.x / my.blockWidth;
        var rayY = my.player.y / my.blockWidth;
        var rayTileX = my.player.tileX;
        var rayTileY = my.player.tileY;


        var rayDir = my.player.direction + Math.atan2(cameraX, my.player.cameraDistance);

        var dx = Math.abs(1 / Math.cos(rayDir));
        var dy = Math.abs(1 / Math.sin(rayDir));

        var sx = +1;
        var sy = +1;

        var rayDistX;
        var rayDistY;
        var lastSide = "";

        if (Math.cos(rayDir) < 0) {
            rayDistX = (rayX - rayTileX) * dx;
            sx = -1;
        }
        else {
            rayDistX = (rayTileX - rayX + 1) * dx;
        }

        if (Math.sin(rayDir) < 0) {
            rayDistY = (rayY - rayTileY) * dy;
            sy = -1;
        }
        else {
            rayDistY = (rayTileY - rayY + 1) * dy;
        }

        while ($gameMap.checkPassage(rayTileX, rayTileY, 0x0f) && rayTileX >= 0 && rayTileX < $gameMap.width() && rayTileY >= 0 && rayTileY < $gameMap.height()) {
            if (rayDistX < rayDistY) {
                rayDistX += dx;
                rayTileX += sx;
                lastSide = "EW";
            }
            else {
                rayDistY += dy;
                rayTileY += sy;
                lastSide = "NS";
            }
        }

        if (lastSide === "EW") {
            distance = Math.abs((rayTileX - rayX + (1 - sx) / 2) / Math.cos(rayDir));
        }
        else {
            distance = Math.abs((rayTileY - rayY + (1 - sy) / 2) / Math.sin(rayDir));
        }

        return {
            distance: distance * my.blockWidth,
            side: lastSide,
            tileX: rayTileX,
            tileY: rayTileY,
            direction: rayDir
        };
    };

    return my;
}(Maze || {}));

var Maze = (function (my) {

    /**
     * 3D maze scene. Displays a Game_Map using a raycasting engine.
     * It can both work as a seamless transition from Scene_Map (with map events still running) or as a different scene
     * (with map events frozen until this scene is terminated).
     *
     * Since it's CPU intensive, rendering quality can be tweaked to improve FPS.
     *
     * @constructor
     * @memberOf Maze
     */
    var Scene_Maze = my.Scene_Maze = function () {
        this.initialize.apply(this, arguments);
    };

    Scene_Maze.prototype = Object.create(Scene_Map.prototype);
    Scene_Maze.prototype.constructor = Scene_Maze;

    Scene_Maze.prototype.initialize = function () {
        Scene_Map.prototype.initialize.call(this);
    };

    /**
     * Creates the scene. Sets the rendering quality and, if it's in maze mode, saves the current $gameMap (freezing running events as a side effect).
     */
    Scene_Maze.prototype.create = function () {
        Scene_Map.prototype.create.call(this);
        if ($gameSystem.quality == null) {
            $gameSystem.quality = 3;
        }

        switch ($gameSystem.quality) {
            case 0: // low
                this.scaleFactor = 4;
                break;
            case 1: // medium
                this.scaleFactor = 2;
                break;
            case 2: // high
                this.scaleFactor = 1;
                break;
            case 3: // auto
                this.scaleFactor = 2;
                break;
        }

        this.screenSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this.addChild(this.screenSprite);


        if (my.isMaze) {
            my.gameMap = $gameMap;
            $gameMap = new Game_Map();
        }
    };

    /**
     * Terminates the scene. If in maze mode, restores the previous $gameMap (unfreezing the events in the process).
     */
    Scene_Maze.prototype.terminate = function () {
        Scene_Map.prototype.terminate.call(this);

        if (my.isMaze) {
            $gameMap = my.gameMap;
        }
    };

    /**
     * On map loaded event handler. Creates the raycasting engine.
     */
    Scene_Maze.prototype.onMapLoaded = function () {
        Scene_Map.prototype.onMapLoaded.call(this);

        my.controller = new my.Maze_Controller(10, 3, 0.05, Math.PI / 64);
        this.raycaster = new my.Maze_Raycaster(this.screenSprite, this.scaleFactor, $gameSystem.quality === 3);

        $gameMap.autoplay();
        this.createWindows();
    };

    /**
     * Creates the spriteset for the scene. Unlike Scene_Map.createSpriteset, it doesn't add the spriteset to the display tree.
     */
    Scene_Maze.prototype.createSpriteset = function () {
        this._spriteset = new Spriteset_Map();

        // Save the tilemap bitmaps for wall rendering.
        my.bmps = this._spriteset._tilemap.bitmaps;
    };

    /**
     * Disables Scene_Map.updateDestination, to disable mouse/touchscreen inputs.
     */
    Scene_Maze.prototype.updateDestination = function () {
    };

    /**
     * Replaces Scene_Map.updateMain (it won't register player's movements).
     */
    Scene_Maze.prototype.updateMain = function () {
        if (!my.controller.paused) {
            var active = this.isActive();
            $gameMap.update(active);
            $gamePlayer.update(false); // Disables player's movement.
            $gameTimer.update(active);
            $gameScreen.update();
        }
    };

    /**
     * Handles user's input and updates the scene.
     */
    Scene_Maze.prototype.update = function () {
        if (!$gameMap.isEventRunning() && !$gameMessage.isBusy()) {
            if (!my.controller.paused) {
                if (Input.isTriggered('escape') || TouchInput.isCancelled()) {
                    my.controller.paused = true;
                    this.bgm = AudioManager.saveBgm();
                    AudioManager.stopBgm();
                    this.pauseWindow.open();
                    this.pauseWindow.activate();
                }

                if (Input.isPressed("shift")) {
                    this.strafing = !Input.isLastInputGamepad(); // For gamepad input, invert the behaviour, since axis 0 defaults to strafe.
                }
                else {
                    this.strafing = Input.isLastInputGamepad();
                }

                if (Input.readAxis(2, 0.5) < 0) {
                    my.player.rotateLeft();
                }
                else if (Input.readAxis(2, 0.5) > 0) {
                    my.player.rotateRight();
                }

                if (Input.isPressed("up")) {
                    my.player.moveForward();
                }
                else if (Input.isPressed("down")) {
                    my.player.moveBackward();
                }

                if (Input.isPressed("left")) {
                    if (this.strafing) {
                        my.player.strafeLeft();
                    }
                    else {
                        my.player.rotateLeft();
                    }
                }
                else if (Input.isPressed("right")) {
                    if (this.strafing) {
                        my.player.strafeRight();
                    }
                    else {
                        my.player.rotateRight();
                    }
                }

                if (TouchInput.isPressed()) {
                    var dx = TouchInput.x - Graphics.width / 2;
                    var dy = TouchInput.y - Graphics.height / 2;
                    var angle = Math.atan2(dy, dx);
                    if (angle < 0) {
                        angle += 2 * Math.PI;
                    }
                    var radius = Math.sqrt(dx * dx + dy * dy);

                    if (radius < Math.min(Graphics.width, Graphics.height) / 4) {
                        $gamePlayer.checkEventTriggerHere([0]);
                        if (!$gameMap.setupStartingEvent()) {
                            $gamePlayer.checkEventTriggerThere([0, 1, 2]);
                            $gameMap.setupStartingEvent();
                        }
                    }
                    else {
                        if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) {
                            my.player.moveBackward();
                        }
                        else if (angle > 5 * Math.PI / 4 && angle < 7 * Math.PI / 4) {
                            my.player.moveForward();
                        }
                        else if (angle > 3 * Math.PI / 4 && angle < 5 * Math.PI / 4) {
                            if (this.strafing) {
                                my.player.strafeLeft();
                            }
                            else {
                                my.player.rotateLeft();
                            }
                        }
                        else if (angle > 7 * Math.PI / 4 || angle < Math.PI / 4) {
                            if (this.strafing) {
                                my.player.strafeRight();
                            }
                            else {
                                my.player.rotateRight();
                            }
                        }
                    }
                }
            }

            my.controller.update();

            this.screenSprite._bitmap.clear();
            this.raycaster.draw();
            my.controller.drawCompass(this.screenSprite._bitmap, 40, 40, 25, "green", "red", "black");
        }

        this.updateDestination();
        this.updateMainMultiply();
        if (this.isSceneChangeOk()) {
            this.updateScene();
        } else if (SceneManager.isNextScene(Scene_Battle)) {
            this.updateEncounterEffect();
        }
        this.updateWaitCount();
        Scene_Base.prototype.update.call(this);
    };

    /**
     * Disables game's menu.
     * @returns {boolean} Always false.
     */
    Scene_Maze.prototype.isMenuEnabled = function () {
        return false;
    };

    /**
     * Creates the windows for the pause menu.
     */
    Scene_Maze.prototype.createWindows = function () {
        this.createWindowLayer();

        if (this.pauseWindow == null) {
            this.pauseWindow = new my.Maze_Window_Pause();
            this.pauseWindow.setHandler("cancel", this.resume.bind(this));
            this.pauseWindow.setHandler("retry", this.retry.bind(this));
            this.pauseWindow.setHandler("quality", this.setQuality.bind(this));
            this.pauseWindow.setHandler("quit", this.quit.bind(this));
        }

        if (this.confirmWindow == null) {
            this.confirmWindow = new my.Maze_Window_Confirm();
            this.confirmWindow.x = this.pauseWindow.x + this.pauseWindow.windowWidth();
        }

        this.addWindow(this.pauseWindow);
        this.addWindow(this.confirmWindow);
        this.addChild(this.pauseWindow);
        this.addChild(this.confirmWindow);
    };

    /**
     * Resume callback.
     */
    Scene_Maze.prototype.resume = function () {
        this.pauseWindow.close();
        this.pauseWindow.deactivate();

        my.controller.paused = false;

        this.bgm = this.bgm || $dataMap.bgm;
        AudioManager.replayBgm(this.bgm);
    };

    /**
     * Quality change callback.
     */
    Scene_Maze.prototype.setQuality = function () {
        $gameSystem.quality = ($gameSystem.quality + 1) % 4;
        this.pauseWindow.activate();
        this.pauseWindow.refresh();
        switch ($gameSystem.quality) {
            case 0: // low
                this.scaleFactor = 4;
                this.raycaster.setQuality(4, false);
                break;
            case 1: // medium
                this.scaleFactor = 2;
                this.raycaster.setQuality(2, false);
                break;
            case 2: // high
                this.scaleFactor = 1;
                this.raycaster.setQuality(1, false);
                break;
            case 3: // auto
                this.scaleFactor = 2;
                this.raycaster.setQuality(2, true);
                break;
        }
    };

    /**
     * Retry callback. Opens the confirmation window.
     */
    Scene_Maze.prototype.retry = function () {
        this.pauseWindow.deactivate();
        this.confirmWindow.y = this.pauseWindow.itemHeight() + this.pauseWindow.y;
        this.confirmWindow.setHandler("accept", this.acceptSelection.bind(this, "retry"));
        this.confirmWindow.setHandler("cancel", this.undo.bind(this));
        this.confirmWindow.open();
        this.confirmWindow.selectSymbol("cancel");
        this.confirmWindow.activate();
    };

    /**
     * Quit callback. Opens the confirmation window.
     */
    Scene_Maze.prototype.quit = function () {
        this.pauseWindow.deactivate();
        this.confirmWindow.y = this.pauseWindow.itemHeight() * 2 + this.pauseWindow.y;
        this.confirmWindow.setHandler("accept", this.acceptSelection.bind(this, "quit"));
        this.confirmWindow.setHandler("cancel", this.undo.bind(this));
        this.confirmWindow.open();
        this.confirmWindow.selectSymbol("cancel");
        this.confirmWindow.activate();
    };

    /**
     * Confirmation window's undo callback.
     */
    Scene_Maze.prototype.undo = function () {
        this.confirmWindow.close();
        this.confirmWindow.deactivate();
        this.pauseWindow.activate();
    };

    /**
     * Confirmation window's accept callback. Performs the requested command.
     * @param cmd Requested command.
     */
    Scene_Maze.prototype.acceptSelection = function (cmd) {
        this.confirmWindow.close();
        this.confirmWindow.deactivate();
        this.pauseWindow.close();

        switch (cmd) {
            case "retry":
                my.controller.reset();
                this.raycaster.draw();
                break;
            case "quit":
                if (my.isMaze) {
                    $mazeClear = false;
                    $gamePlayer.reserveTransfer(my.oldPosition.id, my.oldPosition.x, my.oldPosition.y, my.oldPosition.direction, 2);
                }

                SceneManager.goto(Scene_Map);
                break;
        }
    };

    return my;
}(Maze || {}));

var Maze = (function (my) {

    /**
     * Pause window.
     * @constructor
     * @memberOf Maze
     */
    var Maze_Window_Pause = my.Maze_Window_Pause = function () {
        this.initialize.apply(this, arguments);
    };

    Maze_Window_Pause.prototype = Object.create(Window_Command.prototype);
    Maze_Window_Pause.prototype.constructor = Maze_Window_Pause;

    Maze_Window_Pause.prototype.initialize = function () {
        Window_Command.prototype.initialize.call(this, 0, 0);
        this.updatePlacement();
        this.openness = 0;
    };

    Maze_Window_Pause.prototype.windowWidth = function () {
        return 240;
    };

    Maze_Window_Pause.prototype.updatePlacement = function () {
        this.x = (Graphics.boxWidth - this.width) / 2;
        this.y = (Graphics.boxHeight - this.height) / 2;
    };

    /**
     * Creates the window's command list.
     */
    Maze_Window_Pause.prototype.makeCommandList = function () {
        this.addCommand(my.resume, "cancel", true);
        this.addCommand(my.retry, "retry", my.canRetry);
        this.addCommand(my.quality, "quality", true);
        this.addCommand(my.quit, "quit", my.canQuit);
    };

    /**
     * Draws a single item. For the quality item it also draws the current setting.
     *
     * @param index Index of the item to draw.
     */
    Maze_Window_Pause.prototype.drawItem = function (index) {
        var rect = this.itemRectForText(index);
        var statusWidth = 120;
        var titleWidth = rect.width - statusWidth;
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, titleWidth, 'left');
        if (this.commandSymbol(index) === "quality") {
            var quality;

            switch ($gameSystem.quality) {
                case 0:
                    quality = my.qLow;
                    break;
                case 1:
                    quality = my.qMedium;
                    break;
                case 2:
                    quality = my.qHigh;
                    break;
                case 3:
                    quality = my.qAuto;
                    break;
            }

            this.drawText(quality, titleWidth, rect.y, statusWidth, 'right');
        }
    };

    /**
     * Confirmation window.
     * @constructor
     * @memberOf Maze
     */
    var Maze_Window_Confirm = my.Maze_Window_Confirm = function () {
        this.initialize.apply(this, arguments);
    };

    Maze_Window_Confirm.prototype = Object.create(Window_HorzCommand.prototype);
    Maze_Window_Confirm.prototype.constructor = Maze_Window_Confirm;

    Maze_Window_Confirm.prototype.initialize = function () {
        Window_HorzCommand.prototype.initialize.call(this, 0, 0);
        this.updatePlacement();
        this.openness = 0;
    };

    Maze_Window_Confirm.prototype.windowWidth = function () {
        return 150;
    };

    Maze_Window_Confirm.prototype.updatePlacement = function () {
        this.x = (Graphics.boxWidth - this.width) / 2;
        this.y = (Graphics.boxHeight - this.height) / 2;
    };

    Maze_Window_Confirm.prototype.maxCols = function () {
        return 2;
    };

    Maze_Window_Confirm.prototype.makeCommandList = function () {
        this.addCommand(my.yes, "accept", true);
        this.addCommand(my.no, "cancel", true);
    };

    return my;
}(Maze || {}));

