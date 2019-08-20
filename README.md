Raycasting Maze Plugin for RPG Maker MV
===================================

This JavaScript plugin for [RPG Maker MV](http://www.rpgmakerweb.com/products/programs/rpg-maker-mv) implements 3D mazes using a raycasting engine.


Plugin features
---------------

This plugin allows to create an explorable 3D maze:

![Gameplay](screenshots/gameplay.gif)

Mazes can be generated from existing maps (with walls large 1x1 tile):

![Map](screenshots/map.png)

...or automatically, by specifying only the maze size:

![Generate](screenshots/generate.png)



Gameplay
--------

Mazes can be played either with a keyboard/joypad or a mouse/touchpad.

The controls are simple:

- Pause menu: `escape` key or `right` mouse click,
- Strafing: `shift` key,
- Keyboard movement:
    -`up` and `down` arrow keys move the player forward or backward,
    - `left` and `right` keys rotate (when `shift` is not pressed) the player or make it move sideways (when `shift` is pressed),
    - `ok` (`enter` or `space`) key triggers the event in front of the player;
- Mouse movement:
    - `left` mouse click near the center of the screen triggers the event in front of the player,
    - `left` mouse click near the border  of the screen moves the player in the pointed direction.
    
Some events on map can attract the player's compass, making exploration easier (if the pull comes from the actual destination) or harder (if other events pull the compass).

A maze can be either a different representation of a game map or a minigame.
In minigame mode the objective is to trigger an event which will call the command `Maze success`, while avoiding the accidental triggering of events with the `Maze fail` command.
After a minigame ends, its results can be used to award prizes, advance the plot, etc.

Remarks
-------

The engine is already CPU-intensive, floors and ceilings require a *quasi-raytracing* approach (demanding many more computations than drawing walls), so they are not drawn.

Additional resources
--------------------

A demo can be downloaded in the release section, or can be played online [here](https://strontiumaluminate.altervista.org/raycasting).

The internal JSDoc documentation is available [here](https://HashakGik.github.io/Raycasting-RMMV).