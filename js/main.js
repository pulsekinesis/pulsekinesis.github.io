// main.js
// @pulsekinesis

// three.js library
import * as threeJS from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Setting up Scene
const scene = new threeJS.Scene();
const camera = new threeJS.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

let object;
let controls;
let objToRender = 'head';
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

const loader = new GLTFLoader();

// Load the file
loader.load(
    `models/${objToRender}/scene.gltf`,
    function (gltf) {
        // if the file is loaded, add it into the scene
        object = gltf.scene;
        scene.add(object);
    },
    function (xhr) {
        // while it's loading, log the progress
        // debug only
        console.log((xhr.loaded / xhr.total * 100) + "% loaded");
    },
    function (error) {
        // if something wrong occurs, log it
        console.error(error);
    }
);

// Initialize renderer
const renderer = new threeJS.WebGLRenderer({alpha: true}); 
renderer.setSize(window.innerWidth, window.innerHeight);

// Add renderer to DOM
document.getElementById("container3D").appendChild(renderer.domElement);

// Set camera position
camera.position.z = 3.25;

const ambientLight = new threeJS.AmbientLight(0x333333, 25);
scene.add(ambientLight);

// Render the scene
renderer.setSize(window.innerWidth/2, window.innerHeight/2);
function animate() {
    requestAnimationFrame(animate);
    object.rotation.y = -3 + mouseX / window.innerWidth * 3;
    object.rotation.x = -1.0 + mouseY * 2.5 / window.innerHeight;
    renderer.render(scene, camera);
}

// Event listener for resizing
window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectMatrix();
    renderer.setSize(window.innerWidth/2, window.innerHeight/2);
});

document.onmousemove = (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

// Start
animate();