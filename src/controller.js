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