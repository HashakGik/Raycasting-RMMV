.PHONY: demo
all: concat docs demo
concat:	src/*.js
	cat src/plugin.js > Maze.js
	printf "\r\n\r\n" >> Maze.js
	cat src/controller.js >> Maze.js
	printf "\r\n\r\n" >> Maze.js
	cat src/event.js >> Maze.js
	printf "\r\n\r\n" >> Maze.js
	cat src/player.js >> Maze.js
	printf "\r\n\r\n" >> Maze.js
	cat src/raycaster.js >> Maze.js
	printf "\r\n\r\n" >> Maze.js
	cat src/scene.js >> Maze.js
	printf "\r\n\r\n" >> Maze.js
	cat src/windows.js >> Maze.js
	printf "\r\n\r\n" >> Maze.js
docs: src/*.js jsdoc-conf.json
	jsdoc -c jsdoc-conf.json
demo: .PHONY
	cp Maze.js demo/js/plugins/Maze.js
	zip -r release.zip demo
clean:
	rm -f Maze.js
	rm -rf docs
	rm -rf release.zip
