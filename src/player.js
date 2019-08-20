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