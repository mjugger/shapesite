(() => {
    var width = window.innerWidth;
    var height = window.innerHeight;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);
     
    var scene = new THREE.Scene;
    scene.background = new THREE.Color( 0xf0f0f0 );
    console.log(scene);
    var cubeGeometry = new THREE.CubeGeometry(20, 20, 20, 5, 5, 5);
    var cubeMaterial;
    var cube;
    var floor;
    var cubes = [];
    function randomColorMesh() {
        return new THREE.Color(parseInt('0x'+Math.floor(Math.random()*16777215).toString(16), 16));
    }

    var cubicalLoader = new THREE.OBJLoader();
    var theCubical;
    // load a resource
    cubicalLoader.load(
        '../STUCT_LOW-RES-resized.obj',
        function ( object ) {
            theCubical = object;
            theCubical.position.y = 2;
            theCubical.rotation.z = 2;
            console.log('theCubical: ', theCubical);
            theCubical.traverse( function ( child ) {
                if ( child instanceof THREE.Mesh ) {
                    console.log('child: ', child);
                    child.material.wireframe = true;
                    child.geometry.buffersNeedUpdate;
                    child.geometry.uvsNeedUpdate;
                }
            });
            scene.add( theCubical );
            document.addEventListener( 'mousemove', onDocumentMouseMove, false );
            render();
        }
    );

        // FLOOR
    var loader = new THREE.TextureLoader();
    loader.load('../imgs/MATRIX_CORE_DISPLACEMENT_8K.png', function ( texture ) {

    var floorMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1
    });
    var floorGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    //floor.position.y = -20;
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -10;
    scene.add(floor);
    });


    var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);

    //camera.position.y = 30;
    //camera.position.z = 30;

    camera.position.x = 32;
    camera.position.y = -11;
    camera.position.z = 65;

    scene.add(camera);
     
    renderer.render(scene, camera);


    var mouse = new THREE.Vector3( 0, 0, 1 );
    function onDocumentMouseMove( event ) {
        mouse.x = ( event.clientX - window.innerWidth / 2 );
        mouse.y = ( event.clientY - window.innerHeight / 2 );
    }

    var skyboxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
    var skyboxMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
    var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
     
    scene.add(skybox);

    var pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(0, 300, 200);
     
    scene.add(pointLight);

    renderer.render(scene, camera);

    function render() {
        var rotSpeed = 0.01;
        //theCubical.rotation.y = ( ( mouse.x - theCubical.rotation.y ) * .00008);
        //theCubical.rotation.x =  mouse.x * Math.cos(rotSpeed) * Math.sin(rotSpeed);
        //floor.rotation.y =  ( ( - mouse.y  - floor.rotation.y ) * .0008);
        //theCubical.rotation.z =  ( ( - mouse.y  - theCubical.rotation.z ) * .00008);

        camera.position.x = mouse.x * Math.cos(rotSpeed) * Math.sin(rotSpeed);
        camera.position.y = mouse.y * Math.cos(rotSpeed) * Math.sin(rotSpeed);
        //camera.position.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
        //camera.position.y = -( ( mouse.y - camera.position.y ) * .008);
        //camera.position.x = - ( ( - mouse.x  - camera.position.x ) * .005);
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
         
        requestAnimationFrame(render);
        console.log(camera);
    }

    //controls = new THREE.OrbitControls( camera, renderer.domElement );


})();