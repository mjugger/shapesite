require('./OBJLoader');
require('./OrbitControls');
require('./lzma');

export default class Cubical {
    constructor() {
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.windowWidth, this.windowHeight);
        this.mouse = new THREE.Vector3( 0, 0, 1 );
        this.scene = null;
        this.camera = null;
        this.rotSpeed = 0.01;
        this.threeDContainerSelector = '#cubical-holder';
        this.coreCubicalDimensions = new THREE.Vector3(5, 5, 5);
        this.createEnvironment();
    }

    /**
     * [createCube: creates a cube for use in the homepage abstract shape]
     * @param  {[String]} texturePath [the file path to the texture image]
     * @param  {[Object]} size        [dimensions of the cube: w = width, h = height, d = depth]
     * @param  {[Object]} position    [a THREE Vector3 object used to position the cube]
     * @return {[Promise]}            [contains the constructed cube]
     */
    createCube(texturePath, size, position) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(texturePath, texture => {
                const alpha = loader.load('../imgs/Square_Standard_simple_alpha.jpg');
                const geometry = new THREE.CubeGeometry(size.h, size.w, size.d);
                const meshMaterial = new THREE.MeshStandardMaterial({
                    transparent: true,
                    map: texture,
                    alphaMap:alpha
                });
                meshMaterial.side = THREE.DoubleSide;
                const cube = new THREE.Mesh(geometry, meshMaterial);
                cube.position.copy(position);
                resolve(cube);
            }, null, error => reject(error));
        });
    }

    /**
     * [createDevCube: creates a cube with numbers on each cube face]
     * @param  {[String]} texturePath [the file path to the texture image]
     * @param  {[Object]} size        [dimensions of the cube: w = width, h = height, d = depth]
     * @param  {[Object]} position    [a THREE Vector3 object used to position the cube]
     * @param  {[Number]} i           [the number of the current cube from the loop]
     * @return {[Promise]}            [contains the constructed cube with a number on each side]
     */
    createDevCube(texturePath, size, position, i) {
        var x = document.createElement("canvas");
        var xc = x.getContext("2d");
        x.width = x.height = 128;
        xc.shadowColor = "#000";
        xc.shadowBlur = 7;
        xc.fillStyle = "orange";
        xc.font = "30pt arial bold";
        xc.fillText(i, 10, 64);
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(texturePath, texture => {
                const geometry = new THREE.CubeGeometry(size.h, size.w, size.d);
                const meshMaterial = new THREE.MeshStandardMaterial({
                    transparent: false,
                    map: new THREE.Texture(x)
                });
                meshMaterial.map.needsUpdate = true;
                meshMaterial.side = THREE.DoubleSide;
                const cube = new THREE.Mesh(geometry, meshMaterial);
                cube.position.copy(position);
                resolve(cube);
            }, null, error => reject(error));
        });
    }

    /**
     * [assimbleCubicalShape: generates multiple cubes to create the homepage abstract shape]
     * @return {[Promise]} [contains all the generated cubes as one object group]
     */
    assimbleCubicalShape() {
        const cubeTexturePath = '../imgs/Square_Standard_simple.png';
        const cubePromises = [];
        const amountOfCubes = (
            this.coreCubicalDimensions.x
            *
            this.coreCubicalDimensions.y
            *
            this.coreCubicalDimensions.z
        );
        let cubePosition;
        let posX = 0;
        let posY = 0;
        let posZ = 0;
        const cubeDimensions = {
            w: 4,
            h: 4,
            d: 4
        };
        // array of cubes to skip
        // so the cubical has a more abstract look
        const skipCubeArray = [
            3,4,9,16,
            20,21,22,23,
            24,45,46,47,
            48,49,50,70,
            71,73,74,77,
            79,94,95,96,
            97,98,99,101,
            102,103,104,105,
            107,109,111,113,
            114,115,116,117,
            118,119,120,121,
            122,123,124
        ];
        //TODO: research if there's a more efficient way to build a cube of cubes
        for(var i = 0; i < amountOfCubes; i++) {


            if (posZ === (this.coreCubicalDimensions.z - 1) * cubeDimensions.d) {
                posX += (cubeDimensions.w * this.coreCubicalDimensions.x)%posZ;
                posX = posX%(this.coreCubicalDimensions.x * cubeDimensions.w);
            }
            if (
                posZ === (this.coreCubicalDimensions.z - 1) * cubeDimensions.d
                &&
                posX === (this.coreCubicalDimensions.x - 1) * cubeDimensions.w
            ) {
                posY += (cubeDimensions.h * this.coreCubicalDimensions.y)%posX;
                posY = posY%(this.coreCubicalDimensions.y * cubeDimensions.h);
            }
            posZ = (i%this.coreCubicalDimensions.z) * cubeDimensions.d;
            if (skipCubeArray[0] === i) {
                skipCubeArray.shift();
            }else {
                cubePosition = new THREE.Vector3(posX, posY, posZ);
                cubePromises.push(this.createCube(cubeTexturePath, cubeDimensions, cubePosition));
            }

        }
        return new Promise((resolve, reject) => {
            Promise.all(cubePromises)
            .then(cubes => {
                const group = new THREE.Object3D();
                cubes.forEach(cube => group.add(cube));
                console.log(group);
                group.position.x = -3;
                group.position.y = -6;
                group.position.z = -6;
                
                // group.translate( 0, 0, 0 );
                group.rotation.z = 1;
                group.rotation.y = 1;
                //group.rotation.x = 1;
                return group;
            })
            .then(group => this.scene.add(group))
            .then(() => resolve())
            .catch(error => reject(`assimbleCubicalShape ERROR: ${error}`));
        });

    }

    createEnvironment() {
        this.scene = new THREE.Scene;
        this.scene.background = new THREE.Color(0xf0f0f0);
        Promise.all([
            this.createFloor(),
            this.assimbleCubicalShape()
        ])
        .then(() => this.createMainCamera())
        .then(() => this.createMainLight())
        .then(() => this.createSkyBox())
        .then(() => this.embed3D(this.threeDContainerSelector))
        .then(() => this.renderer.render(this.scene, this.camera))
        .then(() => this.render())
        .catch(error => console.log(`promise.all error in constructor: ${error}`));
    }

    createMainLight() {
        const pointLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 15);
        //pointLight.position.set(0, 300, 200);
        this.scene.add(pointLight);
    }

    createSkyBox() {
        const skyboxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
        const skyboxMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
    }

    createFloor() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load('../imgs/MATRIX_CORE_DISPLACEMENT_8K.png', texture => {

            const floorMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1
            });
                const floorGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
                const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                //floor.position.y = -20;
                floor.rotation.x = Math.PI / 2;
                floor.position.y = -10;
                this.scene.add(floor);
                resolve();
            }, null, error => reject(error));
        });
    }

    createMainCamera() {
        this.camera = new THREE.PerspectiveCamera(
                    45,
                    (this.windowWidth / this.windowHeight),
                    0.1,
                    10000
                );
        this.camera.position.x = 32;
        this.camera.position.y = -11;
        this.camera.position.z = 85;

        this.scene.add(this.camera);
        // for dev purposes
        // new THREE.OrbitControls( this.camera, this.renderer.domElement );
    }

    embed3D(selector) {
        const domEl = document.querySelector(selector);
        domEl.appendChild(this.renderer.domElement);
    }

    onDocumentMouseMove(event) {
        this.mouse.x = ( event.clientX - this.windowWidth / 2 );
        this.mouse.y = ( event.clientY - this.windowHeight / 2 );
    }


    render() {
        // comment this out when using the OrbitControls in the "createMainCamera" Fn
        this.camera.position.x = this.mouse.x * Math.cos(this.rotSpeed) * Math.sin(this.rotSpeed);
        // comment this out when using the OrbitControls in the "createMainCamera" Fn
        this.camera.position.y = this.mouse.y * Math.cos(this.rotSpeed) * Math.sin(this.rotSpeed);
        this.camera.lookAt(this.scene.position);
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render());
    }
}