import * as THREE from '../../building/build/three.module.js';

import Stats from '../../building/stats.module.js';

import { GUI } from '../../building/dat.gui.module.js';
import { OrbitControls } from '../../building/OrbitControls.js';
//import { OutlineEffect } from '../../building/OutlineEffect.js';
let timeSenseAction;
var socket = io();

var messages = document.getElementById('messages');
var players = document.getElementById('players');
var form = document.getElementById('form');
var input = document.getElementById('input');
var roomInfo = document.getElementById("roomInfo");
let countDownDate, gameTimerInterval;
var playersEnd = document.getElementById("endRoundScores");
var startGameButton = document.getElementById("newGame");
//entering the room
var pathname = window.location.pathname;
roomInfo.innerHTML += "Code: " + pathname.split("/")[2];

let currentBuilder = false;

const timeoutInnactive = 600000;

let leftUntilTimeout = setTimeout(inactive, timeoutInnactive);
let timeLeft;
var a = document.createElement('a');
var linkText = document.createTextNode("https://"+window.location.hostname+pathname);
a.appendChild(linkText);
a.href = "https://"+window.location.hostname+pathname;
a.target = "_blank";
a.id = "shareUrl";
roomInfo.appendChild(document.createElement('br'));
// roomInfo.innerHTML += "Share this link with friends: ";
roomInfo.appendChild(a);
roomInfo.innerHTML += " ";
var b = document.createElement('input');
b.value = "Copy Url";
b.id = "copyLinkButton";
b.type = "button";
roomInfo.appendChild(b);

const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get('username');
socket.emit('set Username', myParam);

function inactive(){
	console.log("inactive");
	
	socket.disconnect();
	window.location = "../../inactive.html";
}

socket.emit('enter room', pathname.split("/")[2]);
window.history.replaceState({}, document.title,pathname);
form.addEventListener('submit', function(e) {
	e.preventDefault();
	if (input.value) {
		socket.emit('chat message', input.value);
		input.value = '';
	}
});

socket.on('chat message', function(msg, sender) {
	onWindowResize();
	var item = document.createElement('li');
	var messagesContain = document.getElementById("messagesContainer");
	item.textContent = sender + ": " +msg;
	messages.appendChild(item);
	messagesContain.scrollTo(0, messagesContain.scrollHeight);
});

socket.on('chat message win', function(msg, sender) {
	onWindowResize();
	var item = document.createElement('li');
	var messagesContain = document.getElementById("messagesContainer");
	item.textContent = sender + ": " +msg;
	item.classList.add("winner");
	messages.appendChild(item);
	messagesContain.scrollTo(0, messagesContain.scrollHeight);
});

socket.on('update Users', function(msg,admin) {
	onWindowResize();
	players.innerHTML = "";
	for (var i = 0; i < msg.playerNames.length; i++) {
		var item = document.createElement('li');
		var score = document.createElement('li');
		item.textContent = msg.playerNames[i];
		score.textContent = msg.playerScores[i];
		item.classList.add("username");
		score.classList.add("userscore");
		if(msg.playerIds[i] == msg["currentPlayer"]){
			var image = document.createElement("img");
			image.src = "../../cubes.svg"
			image.classList.add("playerLocater");
			item.appendChild(image);
		}
		item.appendChild(score);
		players.appendChild(item);
		
		
	}
	console.log(socket.id)
	if(socket.id == msg.playerIds[0]){
		var adminC = document.getElementById("adminControls")
		adminC.style.display = "block";
	} else{
		var adminC = document.getElementById("adminControls")
		adminC.style.display = "none";
	}
});

socket.on('New Round', function(msg) {
	startGameButton.disabled = true;
	voxels = [];
	var roundsCounter = document.getElementById("GuiRounds");
	roundsCounter.innerHTML = "Round: "+(msg["rounds"]-msg["roundsLeft"]) +"/"+ msg["rounds"];
	var nextButton = document.getElementById("nextRound");
	nextButton.style.display = "none";
	var roundOver = document.getElementById("roundOver");
	roundOver.style.display = "none";

	rebuild([]);

	countDownDate = msg["time"];
	gameTimer();
	gameTimerInterval = setInterval(gameTimer,1000);
	camera.position.set( 800, 1600, 0 );
	camera.lookAt( 0, 0, 0 );
});

socket.on('round Over', function(msg) {
	controls.autoRotate = true;
	currentBuilder = false;
	var roundOver = document.getElementById("roundOver");
	var endWord = document.getElementById("endWord");
	endWord.innerHTML = msg["word"];
	roundOver.style.display = "flex";
	clearInterval(gameTimerInterval);
	document.getElementById("GuiTime").innerHTML = "Player Done";
	
	playersEnd.innerHTML = "";
	var topUserScore = 0;
	var topUser;
	var image;
	for (var i = 0; i < msg.playerNames.length; i++) {
		var item = document.createElement('li');
		var score = document.createElement('li');
		item.textContent = msg.playerNames[i];
		score.textContent = msg.playerScores[i];
		item.classList.add("username");
		item.setAttribute("id",msg.playerIds[i] )
		score.classList.add("userscore");
		
		if(msg.playerScores[i] > topUserScore){
			topUserScore = msg.playerScores[i];
			topUser = msg.playerIds[i];
			
		}
		item.appendChild(score);
		playersEnd.appendChild(item);
		
	}
	if(topUserScore>1){
		var item = document.getElementById(topUser);
		image = document.createElement("img");
		image.src = "../../crown.svg"
		
		image.classList.add("crown");
		item.appendChild(image);
	}
	
	//show round number
	if(msg["currentPlayer"] == socket.id){
		var nextButton = document.getElementById("nextRound");
		nextButton.style.display = "block";

	}
});

socket.on('end Game', function(msg) {
	var roundsCounter = document.getElementById("GuiRounds");
	roundsCounter.innerHTML = "Round Over";
	var nextButton = document.getElementById("nextRound");
	nextButton.style.display = "none";
	var roundOver = document.getElementById("roundOver");
	roundOver.style.display = "none";



	camera.position.set( 800, 1600, 0 );
	camera.lookAt( 0, 0, 0 );

	rebuild([]);
	currentBuilder = false;
	var roundOver = document.getElementById("roundOver");
	roundOver.style.display = "none";
	clearInterval(gameTimerInterval);
	document.getElementById("GuiTime").innerHTML = "Player Done";
	startGameButton.disabled = false;
	controls.autoRotate =false;
});

socket.on('game Update', function(msg,admin) {
	var wordToGuessDiv = document.getElementById("wordToGuess");
	
	countDownDate = msg["time"];

	//console.log(msg["currentPlayer"] + "  " + socket.id);
	if(msg["currentPlayer"] == socket.id){
		currentBuilder = true;
		wordToGuessDiv.innerHTML = msg["word"];
		console.log(currentBuilder);
		//console.log(msg["word"])
		//var now = new Date().getTime();
		//var distance = msg["time"] - now;
		//if(distance < 0) {
		//	socket.emit('end Round');
		//}
		controls.autoRotate = false;
	}else{
		currentBuilder = false;
		rebuild(msg["board"]);
		wordToGuessDiv.innerHTML = "";
		console.log(timeLeft);
		console.log(msg["letterPlace"]);
		for (var i = 0; i < msg["word"].length; i++){
			if(timeLeft < 50 && i == msg["letterPlace"]){
				wordToGuessDiv.innerHTML += msg["word"][i];
			}else if(msg["word"][i] == " "){
				wordToGuessDiv.innerHTML += "    ";

			}else{
				wordToGuessDiv.innerHTML += " _ "
			}
		}
		if(msg["word"].length==0){
			wordToGuessDiv.innerHTML = "<br>";
		}
		controls.autoRotate = false;
		//console.log(msg["time"]);
	}
	
});

document.getElementById("saveBuild").addEventListener("click", saveBuild);

function saveBuild() {

	var link = document.getElementById('link');
  link.setAttribute('download', 'BuildImage.png');
  link.setAttribute('href', renderer.domElement.toDataURL().replace("image/png", "image/octet-stream"));
  link.click();
}

document.getElementById("newGame").addEventListener("click", startRound);
document.getElementById("nextRound").addEventListener("click", startRound);

function startRound(evt) {
	
	var test = document.getElementById("rounds").value;
	var time = document.getElementById("time").value;
	
	startGameButton.disabled = true;
	console.log("startRound");
	
	socket.emit('start Round',test,time);
}



document.getElementById("checkBoxDelete").addEventListener('change', function() {
  if (this.checked) {
    isShiftDown = true;
  } else {
    isShiftDown = false;
  }
});
document.getElementById("showControls").addEventListener('click', function() {
	let info = document.getElementById("info");
  if (info.style.display == "none") {
    info.style.display = "block";
  } else {
    info.style.display = "none";
  }
});

document.getElementById("copyLinkButton").addEventListener("click", function() {
    copyToClipboard(document.getElementById("shareUrl"));
});

function copyToClipboard(elem) {
	  // create hidden text element, if it doesn't already exist
    var targetId = "_hiddenCopyText_";
    var isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
    var origSelectionStart, origSelectionEnd;
    if (isInput) {
        // can just use the original source element for the selection and copy
        target = elem;
        origSelectionStart = elem.selectionStart;
        origSelectionEnd = elem.selectionEnd;
    } else {
        // must use a temporary form element for the selection and copy
        target = document.getElementById(targetId);
        if (!target) {
            var target = document.createElement("textarea");
            target.style.position = "absolute";
            target.style.left = "-9999px";
            target.style.top = "0";
            target.id = targetId;
            document.body.appendChild(target);
        }
        target.textContent = elem.textContent;
    }
    // select the content
    var currentFocus = document.activeElement;
    target.focus();
    target.setSelectionRange(0, target.value.length);
    
    // copy the selection
    var succeed;
    try {
    	  succeed = document.execCommand("copy");
    } catch(e) {
        succeed = false;
    }
    // restore original focus
    if (currentFocus && typeof currentFocus.focus === "function") {
        currentFocus.focus();
    }
    
    if (isInput) {
        // restore prior selection
        elem.setSelectionRange(origSelectionStart, origSelectionEnd);
    } else {
        // clear temporary content
        target.textContent = "";
    }
    return succeed;
}


//get class by id 
//for onclick
//update colorValueLarge
var colorPickerBoxes = document.querySelectorAll(".custom-radios input[type=radio] + label span")
for(var i = 0;i < colorPickerBoxes.length;i++){
	colorPickerBoxes[i].addEventListener("click",changeColor);
	
}
function changeColor(evt){
	var newColor = getComputedStyle(evt.currentTarget).backgroundColor
	
	console.log(newColor);
	colorValueLarge = newColor;
	
}

function gameTimer() {

  // Get today's date and time
  var now = new Date().getTime();

  // Find the distance between now and the count down date
  var distance = countDownDate - now;

  // Time calculations for days, hours, minutes and seconds
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance) / 1000);
	timeLeft = seconds;
  // Display the result in the element with id="demo"
  document.getElementById("GuiTime").innerHTML =  seconds + "s ";

  // If the count down is finished, write some text
  if (distance < 0) {
    clearInterval(gameTimerInterval);
    document.getElementById("GuiTime").innerHTML = "Round Over";
  }
}

let wireframe, renderer, scene, camera, camera2, controls;
let wireframe1;
let matLine, matLineBasic, matLineDashed, effect;
let stats;
//let gui;
let factor = .55;
let plane;
let mouse, raycaster, isShiftDown = false;
let isMouseDown = false;
let rollOverMesh, rollOverMaterial;
let cubeGeo, cubeMaterial;
// viewport
let insetWidth;
let insetHeight;

let colorValueLarge = "#ffae23";
let objects = [];
let voxels = [];
var mouseRepte;
let placespeed = 150;
let rollOverGeo;




let boxDem= [1,1];
let canvas;
let offset;
init();
/*var gui = new GUI({ autoPlace: false });

var customContainer = document.getElementById('Gui');
customContainer.appendChild(gui.domElement);

var conf = { color : '#f1c40f' };    
gui.addColor(conf, 'color').onChange( function(colorValue) {
    colorValueLarge = colorValue;
});*/


/*
gui.add( {"Voxel Width": 1}, 'Voxel Width', 1, 4 ).onChange( function (val) {
	boxDem[0] = val;
	console.log(rollOverMesh.geometry.parameters)

	rollOverGeo = new THREE.BoxGeometry( 50*boxDem[0], 50, 50*boxDem[1] );
	rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
	rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
	scene.add( rollOverMesh );
}).step(1);

gui.add( {"Voxel Length": 1}, 'Voxel Length', 1, 4 ).onChange( function (val) {
	boxDem[1] = val;
	rollOverMesh.geometry.parameters.depth = 50*val;
}).step(1);*/

animate();



function init() {

	renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth * factor, window.innerHeight * factor);
	var renderDiv = document.getElementById("canvasContainer");
	renderDiv.appendChild( renderer.domElement );


	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth * factor / window.innerHeight * factor, 1, 10000 );

	camera.position.set( 800, 1600, 0 );
	camera.lookAt( 0, 0, 0 );
	
	controls = new OrbitControls(camera, renderer.domElement);
	controls.minDistance = 300;
	controls.maxDistance = 2500;
	controls.autoRotate = false;
	controls.autoRotateSpeed = 5;
	controls.touches = {
		ONE: THREE.TOUCH.NONE,
		TWO: THREE.TOUCH.DOLLY_ROTATE
	}
	// roll-over helpers

	rollOverGeo = new THREE.BoxGeometry( 62.5, 62.5, 62.5 );
	rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
	rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
	scene.add( rollOverMesh );

	// cubes

	cubeGeo = new THREE.BoxGeometry( 62.5, 62.5, 62.5 );
	cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
	// grid

	const gridHelper = new THREE.GridHelper( 1000, 16 );
	scene.add( gridHelper );

	// lights

	const ambientLight = new THREE.AmbientLight( 0x606060 );
	scene.add( ambientLight );

	const directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );

	//
	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	const geometry = new THREE.PlaneGeometry( 1000, 1000 );
	geometry.rotateX( - Math.PI / 2 );

	plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
	scene.add( plane );

	objects.push( plane );



	document.addEventListener( 'mousemove', onDocumentMouseMove );
	document.addEventListener( 'mousedown', onMouseDown );
	document.addEventListener( 'mouseup', onMouseUp );
	document.addEventListener( 'keydown', onDocumentKeyDown );
	document.addEventListener( 'keyup', onDocumentKeyUp );

	document.addEventListener( 'touchstart', onTouchStart );
	//document.addEventListener( 'touchend', onTouchEnd );
	//document.addEventListener( 'touchmove', onTouchMove );

	//
	canvas = document.querySelector('canvas');
	window.addEventListener( 'resize', onWindowResize );
	window.addEventListener('scroll', onWindowResize)
	
	onWindowResize();

	stats = new Stats({autoPlace:false});
	document.getElementById("Gui").appendChild( stats.dom );

	//initGui();
	/*effect = new OutlineEffect( renderer );
		new OutlineEffect( renderer, {
		defaultThickness: 0.01,
		defaultColor: [ 0, 0, 0 ],
		defaultAlpha: 0.8,
		defaultKeepAlive: true // keeps outline material in cache even if material is removed from scene
	} );*/
}




function onWindowResize() {
	var w = window.innerWidth * factor;
	var h = window.innerHeight * factor;
	renderer.setSize(w, h);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();


	offset = getMousePos(canvas, window.event);

	
}


//
function animate() {
	//
	
	requestAnimationFrame( animate );
	//effect.render( scene, camera );
	stats.update();

	// main scene
	controls.update();

	renderer.setViewport( 0, 0, window.innerWidth * factor, window.innerHeight * factor );

	
	// renderer will set this eventually
	
	renderer.render( scene, camera );
	
}

function loadFromVoxelsArray(voxels) {
	
}

function getMousePos(scene, evt) {
	console.log("asdf")
	var rect = scene.getBoundingClientRect();
	return {
		x: rect.left,
		y: rect.top
	};
}


function findObjectByKey(array, key, value) {
	for (var i = 0; i < array.length; i++) {

		if (array[i][key].x == value.x && array[i][key].y == value.y && array[i][key].z == value.z) {
			return i;
		}
	}
	console.log("fail!!!1")
	return null;
}
function onMouseDown( event ) {
	clearTimeout(leftUntilTimeout);
	leftUntilTimeout = setTimeout(inactive, timeoutInnactive);
	if(event.button == 0){
		//event.preventDefault();
		isMouseDown = true;
		console.log(isMouseDown);
		mouse.set( ( (event.clientX-offset["x"]) / (window.innerWidth * factor) ) * 2 - 1, - ( (event.clientY-offset["y"]) / (window.innerHeight * factor) ) * 2 + 1 );
		if(currentBuilder){
			placeOrDelete(true);
			setTimeout(placeOrDelete, 150, false);
		}
		
		
		//mouseRepte = setInterval(placeOrDelete, 150);			
	}
	let info = document.getElementById("info");
  if (info.style.display !== "none") {
    info.style.display = "none";
  }
}

function onTouchStart( event ) {
	clearTimeout(leftUntilTimeout);
	leftUntilTimeout = setTimeout(inactive, timeoutInnactive);
	event.preventDefault(); // prevent scrolling
	if(event.touches.length == 1) {
		isMouseDown = true;
		console.log(isMouseDown);
		mouse.set( ( (event.touches[ 0 ].pageX-offset["x"]) / (window.innerWidth * factor) ) * 2 - 1, - ( (event.touches[ 0 ].pageY-offset["y"]) / (window.innerHeight * factor) ) * 2 + 1 );
		if(currentBuilder){
			placeOrDelete(true);
			setTimeout(placeOrDelete, 150, false);
		}
	}else{
		isMouseDown = false;
		clearInterval(mouseRepte);
		console.log(isMouseDown)
	}
	event.target.addEventListener("touchmove", onTouchMove);
	event.target.addEventListener("touchend", onTouchEnd);

}


function placeOrDelete(firstTime = false) {
	if(isMouseDown){

		raycaster.setFromCamera( mouse, camera );

		const intersects = raycaster.intersectObjects( objects );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];

			// delete cube

			if ( isShiftDown ) {
				placespeed = 70;
				if ( intersect.object !== plane ) {

					scene.remove( intersect.object );

					objects.splice( objects.indexOf( intersect.object ), 1 );


					let pos = intersect.object.position;
					
					voxels.splice(findObjectByKey(voxels, 'position', pos),1);

				}

				// create cube

			} else {
				placespeed = 100;
				cubeGeo = new THREE.BoxGeometry( 62.5*boxDem[0], 62.5, 62.5*boxDem[1] );
				const voxel = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial( { color: colorValueLarge } ) );
				
				voxel.position.copy( intersect.point ).add( intersect.face.normal );
				voxel.position.divideScalar( 62.5 ).floor().multiplyScalar( 62.5).addScalar( 31.25 );

				

				scene.add( voxel );
				objects.push( voxel );

				voxels.push({"position":( intersect.point ).add( intersect.face.normal ).divideScalar( 62.5 ).floor().multiplyScalar( 62.5).addScalar( 31.25 ),"color":colorValueLarge})

				
			}
			//console.log(voxels)
			socket.emit('game Update Build', voxels);
			
		}
		if(!firstTime){
			setTimeout(placeOrDelete, placespeed);
		}
		
	}
}


function onMouseUp( event ) {
	if(event.button == 0){
		isMouseDown = false;
		clearInterval(mouseRepte);
		console.log(isMouseDown)
	}
}

function onDocumentMouseMove( event ) {
	clearTimeout(leftUntilTimeout);
	leftUntilTimeout = setTimeout(inactive, timeoutInnactive);
	event.preventDefault();
	
	mouse.set( ( (event.clientX-offset["x"]) / (window.innerWidth * factor) ) * 2 - 1, (- ( (event.clientY-offset["y"]) / (window.innerHeight * factor) ) * 2 + 1 ));
	raycaster.setFromCamera( mouse, camera );
	const intersects = raycaster.intersectObjects( objects );

	if ( intersects.length > 0 ) {

		const intersect = intersects[ 0 ];

		rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
		rollOverMesh.position.divideScalar( 62.5 ).floor().multiplyScalar( 62.5 ).addScalar( 31.25 );

	}
	
	
}

function onTouchMove( event ) {
	event.preventDefault(); // prevent scrolling
	event.stopPropagation();
	if(event.touches.length == 1) {
		mouse.set( ( (event.touches[ 0 ].pageX-offset["x"]) / (window.innerWidth * factor) ) * 2 - 1, - ( (event.touches[ 0 ].pageY-offset["y"]) / (window.innerHeight * factor) ) * 2 + 1 );
		raycaster.setFromCamera( mouse, camera );
		const intersects = raycaster.intersectObjects( objects );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];

			rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
			rollOverMesh.position.divideScalar( 62.5 ).floor().multiplyScalar( 62.5 ).addScalar( 31.25 );

		}
	}
	
	

}

function onTouchEnd( event ) {
	
	isMouseDown = false;
	clearInterval(mouseRepte);
	console.log(isMouseDown)
	

}

function rebuild(arrayOfVoxels){
	while(scene.children.length > 5){ 
    scene.remove(scene.children[5]); 
		
	}
	objects.splice(5,objects.length-5);
	for (var i = 0; i < arrayOfVoxels.length; i++){
		cubeGeo = new THREE.BoxGeometry( 62.5*boxDem[0], 62.5, 62.5*boxDem[1] );
		const voxel = new THREE.Mesh( cubeGeo, new THREE.MeshLambertMaterial( { color: arrayOfVoxels[i]["color"] } ) );
		
		voxel.position.copy(arrayOfVoxels[i]["position"]);
		

		scene.add( voxel );
		objects.push( voxel );
	}
}

function onDocumentKeyDown( event ) {
	clearTimeout(leftUntilTimeout);
	leftUntilTimeout = setTimeout(inactive, timeoutInnactive);
	switch ( event.keyCode ) {

		case 16: isShiftDown = true; break;

	}

}

function onDocumentKeyUp( event ) {

	switch ( event.keyCode ) {

		case 16: isShiftDown = false; break;

	}

}

