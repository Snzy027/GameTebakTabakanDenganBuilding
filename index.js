const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let connectCounter =0;
let openRooms = [];
let roomData = [];
let roomIntervals = [];
var words = ["Tempat tidur", "Kaki", "cangkir", "Telur", "Lebah", "Sapi", "Semut", "Telinga", "Topi", "Matahari", "Serangga", "Busur", "Kotak", "Laut", "Mata", "Anjing", "Babi", "Kucing", "Burung Hantu", "Kebun Binatang", "Lengan", "Bus", "Kelelawar", "Mobil", "Stoples", "Es", "Langit", "Pena", "Bola", "Mangkuk", "Hujan", "Burung", "Cacing", "Jagung", "Drum", "Susu", "Sepatu"];


var hardwords = [ "Bantal", "balon", "bulu", "selimut", "raksasa", "kumbang kecil", "manusia salju", "berlian", "ayam", "Pelangi", "cerobong asap", "Bola mata", "Labu",  "Jerapah", "Unicorn", "Hammock",  "Selimut",  "gajah", "football", "mountain", "computer", "lollipop", "backpack", "baseball",  "segi tiga", "pesawat terbang"];
app.use( express.static( 'static'));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/home.html');
});




app.get('/getUsername/:gameCode', (req, res) => {
  res.sendFile(__dirname + '/static/getUsername.html');
});

app.get('/newroom/:username', (req, res) => {
	var newRoom;
	while(true){
		newRoom = words[Math.floor((Math.random() * words.length))] + words[Math.floor((Math.random() * words.length))];
		if(!openRooms.includes(newRoom)){
			break;
		}	
	}
  res.redirect('/room/'+newRoom+"/?username="+req.params.username);
});

app.get('/newroom', (req, res) => {
	var newRoom;
	while(true){
		newRoom = words[Math.floor((Math.random() * words.length))] + words[Math.floor((Math.random() * words.length))];
		if(!openRooms.includes(newRoom)){
			break;
		}	
	}
  res.redirect('/getUsername/'+newRoom);
});

app.get('/room/:roomId', (req, res) => {
	console.log(req.query.username);
	if(req.query.username == undefined){
		res.redirect('/getUsername/'+req.params.roomId);
	}else{
		res.sendFile(__dirname + '/static/game.html');
	}
  
});

function findObjectByKey(array, key, value) {
	for (var i = 0; i < array.length; i++) {
		if (array[i][key].toString() == value.toString()) {
			return i;
		}
	}
	return null;
}

function endRound(myroom,locat,mySocketId){
	try{
		roomIntervals[locat]["timeOut"] = setTimeout(startRound, 15000,myroom,mySocketId);
		var total = 0;
		for(var i =0;i<roomData[locat]["playerScores"].length;i++){
			total += roomData[locat]["playerScores"][i];
		}
		var playerPlace = roomData[locat]["playerIds"].indexOf(roomData[locat]["currentPlayer"]);
		

		roomData[locat]["playerScores"][playerPlace] += Math.floor(roomData[locat]["drawerScore"] / roomData[locat]["playerScores"].length);
		io.to(myroom).emit('round Over', roomData[locat]);
		roomData[locat]["word"] = "";
	}
	catch(err) {
	console.log(err);
	}
}

function startRound(myroom,mySocketId,rounds = 1,timeToBuild = 100){
	try{

	var stillGoing = true;
	var wordToGuess = words[Math.floor((Math.random() * words.length))];
	var locat = findObjectByKey(roomData, "code", myroom);
	var playerPlace = roomData[locat]["playerIds"].indexOf(roomData[locat]["currentPlayer"])
	playerPlace+=1;
	roomData[locat]["drawerScore"] = 0;
	for(var i = 0; i < roomData[locat]["playerSolved"].length;i++ ){
		roomData[locat]["playerSolved"][i] = false;
	}
	if(playerPlace == 0) {
		roomData[locat]["currentPlayer"] = roomData[locat]["playerIds"][0];
		roomData[locat]["rounds"] = rounds;
		roomData[locat]["roundsLeft"] = rounds;
		roomData[locat]["timeToBuild"] = timeToBuild;
	} else if(playerPlace >=roomData[locat]["playerIds"].length){
		roomData[locat]["currentPlayer"] = roomData[locat]["playerIds"][0];
		
		roomData[locat]["roundsLeft"] -= 1;
		if(roomData[locat]["roundsLeft"]<1){
			//game over code
			stillGoing = false;
			roomData[locat]["board"] = [];
			for(var i =0;i<roomData[locat]["playerScores"].length;i++){
				roomData[locat]["playerScores"][i] = 0;
			}
			roomData[locat]["currentPlayer"] = "";
			console.log(roomData[locat])
			io.to(myroom).emit('end Game', roomData[locat]);
			
			
		}else{
			playerPlace = 0;
		}
	}else{
		roomData[locat]["currentPlayer"] = roomData[locat]["playerIds"][playerPlace];
	}
	
	clearTimeout(roomIntervals[locat]["timeOut"]);

	
	console.log(stillGoing)
	if(stillGoing){
		roomData[locat]["playerSolved"][playerPlace] = true;
		//game timer code in millisecends twice
		roomData[locat]["time"] = new Date().getTime()+roomData[locat]["timeToBuild"] *1000;
		roomIntervals[locat]["timeOut"] = setTimeout(endRound, roomData[locat]["timeToBuild"] *1000,myroom,locat,mySocketId);
		console.log(roomData[locat]["time"]);
		roomData[locat]["board"] = [];
		roomData[locat]["word"] = wordToGuess;
		roomData[locat]["letterPlace"] = Math.floor(Math.random() * wordToGuess.length);
		io.to(myroom).emit('New Round', roomData[locat]);
		io.to(myroom).emit('game Update', roomData[locat], mySocketId);
		io.to(myroom).emit('update Users', roomData[locat]);
	}
	}
	catch(err) {
	console.log(err);
	}
}

io.on('connection', (socket) => {
	let myroom;
	let myUserName;
	let mySocketId = socket.id;
  console.log('a user connected');
	console.log(socket.id)
	connectCounter++;
	socket.on('disconnecting', () => {
    
		try {
			var locat = findObjectByKey(roomData, "code", myroom);
			locatPlace = roomData[locat].playerIds.indexOf(socket.id);
			console.log(locatPlace)
			if(roomData[locat]["playerIds"][locatPlace] == roomData[locat]["currentPlayer"]){
				clearTimeout(roomIntervals[locat]["timeOut"]);
				startRound(myroom,mySocketId);
			};
			roomData[locat].playerIds.splice(locatPlace,1);
			roomData[locat].playerNames.splice(locatPlace,1);
			roomData[locat].playerScores.splice(locatPlace,1);
			roomData[locat].playerSolved.splice(locatPlace,1);
			io.to(myroom).emit('update Users', roomData[locat]);
			if(roomData[locat].playerIds.length == 0){
				roomData.splice(locat,1);
				openRooms.splice(locat,1);
				console.log(roomData);

			}
		}
		catch(err) {
			console.log(err);
		}
		
  });

  socket.on('disconnect', () => {
		connectCounter--;
    console.log('user disconnected');
		console.log(connectCounter); //number of socket clients connected
		if(connectCounter == 0) {
			openRooms = [];
			roomData = [];
			roomIntervals = [];
		}
		console.log(roomData);
  });

	//Message
	socket.on('chat message', (msg) => {
		try {
			var locat = findObjectByKey(roomData, "code", myroom);
			var playerInfoLocation = roomData[locat]["playerIds"].indexOf(socket.id);
			try {
				if(msg.toLowerCase() == roomData[locat]["word"].toLowerCase()){
				var now = new Date().getTime();
				// Find the distance between now and the count down date
				var distance = Math.floor((roomData[locat]["time"] - now)/100);
				
				if(!roomData[locat]["playerSolved"][playerInfoLocation]){
					roomData[locat]["playerScores"][playerInfoLocation] += distance;
					roomData[locat]["playerSolved"][playerInfoLocation] = true;
					roomData[locat]["drawerScore"] += distance;
					io.to(myroom).emit('update Users', roomData[locat]);

					io.to(myroom).emit('chat message win', "Guessed the Answer!", roomData[locat]["playerNames"][playerInfoLocation]);

					if(roomData[locat]["playerSolved"].indexOf(false)==-1){
						clearTimeout(roomIntervals[locat]["timeOut"]);
						endRound(myroom,locat,socket.id);
					}
				}
				
				}else{

					io.to(myroom).emit('chat message', msg.substring(0, 100), roomData[locat]["playerNames"][playerInfoLocation]);
				}
				
			}
			catch(err) {
				io.to(myroom).emit('chat message', msg.substring(0, 100), roomData[locat]["playerNames"][playerInfoLocation]);
				console.log(err);
			}
		}catch(err) {
			console.log(err);
		}
		

  });

	socket.on('enter room', (msg) => {
    console.log(msg);
		msg = msg.toLowerCase()
		socket.join(msg);
		var locat;
		if(!openRooms.includes(msg)){
			openRooms.push(msg);
			roomIntervals.push({"roomName":msg});
			roomData.push({"code":msg, "playerIds":[socket.id], "playerNames":[myUserName], "playerScores":[0],"playerSolved":[false],"drawerScore":0})
			locat = roomData.length-1;
		}else{
			locat = findObjectByKey(roomData, "code", msg);
			roomData[locat].playerIds.push(socket.id);
			roomData[locat].playerNames.push(myUserName);
			roomData[locat].playerScores.push(0);
			roomData[locat].playerSolved.push(false);
		}
		myroom = msg;
		io.to(myroom).emit('update Users', roomData[locat]);
		console.log(roomData);
  });

	socket.on('set Username', (msg) => {
		myUserName = msg.substring(0, 14);
    console.log(msg);
		
  });

	socket.on('start Round', (msg, timeToBuild) => {
		if(timeToBuild>300){
			timeToBuild = 300;
		}else if(timeToBuild<15){
			timeToBuild = 15;
		}
		startRound(myroom,mySocketId,msg,timeToBuild);
		
		
  });


	socket.on('game Update Build', (msg) => {
		try{
		var locat = findObjectByKey(roomData, "code", myroom);
		roomData[locat]["board"] = msg;
		
		io.to(myroom).emit('game Update', roomData[locat], mySocketId);
		}
		catch(err) {
			console.log(err);
		}
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});