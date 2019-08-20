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