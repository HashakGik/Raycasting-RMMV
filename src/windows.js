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