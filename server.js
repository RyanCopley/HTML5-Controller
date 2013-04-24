var io = require('socket.io').listen(9000);  

// Read the file and print its contents.
var fs = require('fs'), filename = "layout.html", controllerPage="";

fs.readFile(filename, 'utf8', function(err, data) {
    controllerPage = data;
    console.log("Controller loaded");
});

var gamePairs = []; // controller : game (Since controller pushes and game client receives)

var games = [];
var pairs = [];

function safeCapture(data,property){
    if (data.hasOwnProperty(property)){
        return data[property];
    }
	return "";
}


function makePairCode(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function findGameByController(controller){
    return safeCapture(gamePairs,controller);
}
io.set('log level', 1);
io.sockets.on('connection', function (socket) {
	socket.emit('IDENTIFY', {});
	socket.on('IAM', function (data) {
		if ((msg=safeCapture(data,"IAM")) != ""){
			if (msg=="controller"){
				//Enter this connection into the pool of controllers
				console.log("Accepted a controller");
			}
            
			if (msg=="gameclient"){
				//Enter this connection into the pool of game connections
				games.push( socket );
				console.log("Accepted a game client");
                
                //Ensure all pair codes are unique.
				var pairCode = makePairCode();
				while (games.hasOwnProperty(pairCode)){
					pairCode = makePairCode();
				}
                //Send the game client their game pair code
				socket.emit("YOURCODE",{"code": pairCode})

				games[pairCode] = socket;
    			console.log("Game client pair code: "+pairCode);
				
			}
		}
	});


	socket.on("PAIR", function(data){
        
		if ((pairCode=safeCapture(data,"IDENTIFIER")) != ""){
			//Scan the pool for games with that identifier
			console.log("Pair Code attempt:"+pairCode);
			if (games.hasOwnProperty(pairCode)){
                game = games[pairCode];
            
                gamePairs[socket] = game;
                
				console.log("Pair successful!");
                
                socket.emit("CONTROLLER",{"controller":controllerPage});
				game.emit("PAIRED",{});

			}
		}
	});
    
    
    socket.on("ORIENTATION", function (data){
        //Find the game
        var controller = socket;
        var game = findGameByController(controller);
        
        game.emit("ORIENTATION",data);
        
    });

    socket.on("KEYPRESS", function (data){
        //Find the game
        var controller = socket;
        var game = findGameByController(controller);
        
        game.emit("KEYPRESS",data);
        
    });

});
