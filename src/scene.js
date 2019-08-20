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
                    this.strafing = true;
                }
                else {
                    this.strafing = false;
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