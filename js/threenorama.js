var halfSphereJson;

function NGTScene() {
	
	var that = this;

	this.init = function () {
		this.onChangeRect = undefined;
		
		this.userMouseDown = false; //Is the mouse button currently pressed
		this.mouseDownPosition = new THREE.Vector2(0, 0); //The mouse position when the user first pressed the button
		this.mouseVectorNDC = new THREE.Vector2(0, 0); //The mouse down position in NDC coordinates
		this.mouseDragVector = new THREE.Vector2(0, 0); //The current position of the mouse in relation to the mousedown vector
		this.oldMouseDragVector = new THREE.Vector2(0, 0); //The mouseDragVector of the last frames
		this.lastMousePosition = new THREE.Vector2(0, 0); //The actual mouse position on the screen at any time
		this.target = new THREE.Vector3(0, 0, 0); //The direction the camera is looking at
		
		this.viewFinderGrabbed = false; // Is there an interaction with the current view finder?
		this.startVector = undefined;
		this.sizeVector = undefined; //THe 2 vectors used for the viewfinder cration
		
		this.moveMode = true; // Is the scene currently in move mode?
		this.buttonClicked = false; //Was one of the buttons clicked? (Used to stop the scene from falesly updating)
		this.sphereRadius; //Radius of the half Sphere, used for Setting a Vector to the correct length
		this.sliderPressed = false; //Was the zoom slider pressed?
		
		this.raycaster = new THREE.Raycaster(); //The raycaster for all further raycasts
		
		
		this.loader = new THREE.JSONLoader(); //Loads the halfsphere model into the scene
		
		this.scene = new THREE.Scene(); //The Scene used on the canvas
		
		this.renderer = new THREE.WebGLRenderer();
		this.canvas = this.renderer.domElement;
		
		this.sphere; // The halfsphere that the panorama is projected on
		
		this.ngtCamera = new NGTCamera(this);
		this.ngtAnchors = new NGTAnchors(this);
		this.ngtRect = new NGTRect(this, this.ngtAnchors);
		this.renderer.setSize(this.canvas.width, this.canvas.height);

		
		document.onmouseup = function () {
			this.buttonClicked = false;
			this.sliderPressed = false;
		}
		var model = this.loader.parse(JSON.parse(halfSphereJson));
		//Load the sphere from a js file and initializes some dependent objects
			var material = new THREE.MeshBasicMaterial({color: 0x888888});
			material.side = THREE.BackSide;
			that.sphere = new THREE.Mesh(model.geometry, material);
			that.scene.add(that.sphere);
			var light = new THREE.AmbientLight(0x404040); // soft white light
			that.scene.add(light);
			that.scene.add(that.ngtCamera.camera);
			material.dispose();
			
			
			//Needs to adjust camera once before the scene starts
			var beta = THREE.Math.degToRad(90 + 45);
			var gamma = THREE.Math.degToRad(that.mouseDragVector.x);

			var x, y, z;
			x = Math.sin(beta) * Math.cos(gamma);
			y = Math.cos(beta);
			z = Math.sin(beta) * Math.sin(gamma);
			that.target = new THREE.Vector3(x, y, z).normalize();
			that.ngtCamera.camera.lookAt(that.target);
			that.mouseDragVector.y = -45;
			that.ngtAnchors.findInitialUvVector();
			that.createViewFinderFromCamera();
			that.sphereRadius = that.sizeVector.length();
			that.render();
	};

	this.changeImage = function(imgSrc){
		var texture = THREE.ImageUtils.loadTexture(imgSrc);
		texture.minFilter = THREE.NearestFilter;
		var material = new THREE.MeshBasicMaterial({ map: texture });
		material.side = THREE.BackSide;
		if(this.sphere != undefined){
			this.sphere.material = material;
			this.ngtAnchors.findInitialUvVector();
		}
		
		return material;
	};
	
	this.mouseDown = function (mouse) {
		that.userMouseDown = true;
		that.mouseDownPosition = new THREE.Vector2(mouse.x, mouse.y);
				
		//When the mode is switched the old drag vector must be saved, to have the correct one when moving again
		if (that.moveMode)
			that.oldMouseDragVector = that.mouseDragVector;
		else
			that.mouseDragVector = that.oldMouseDragVector;
					
		//NDC = Normalized Device Coordinates (Range from -1 to 1), Y being inverted
		that.mouseVectorNDC = new THREE.Vector2(that.mouseDownPosition.x / that.canvas.width * 2 - 1,
			((that.mouseDownPosition.y) / that.canvas.height * 2 - 1) * -1);
		that.raycaster.setFromCamera(that.mouseVectorNDC, that.ngtCamera.camera);

		that.moveMode = true;
		if (that.ngtAnchors.anchor1 != null) {	
			//Check if an Anchor of the viewfinder was hit	
			var hitObject = that.raycaster.intersectObjects([that.ngtAnchors.anchor1, that.ngtAnchors.anchor2,
				that.ngtAnchors.anchor3, that.ngtAnchors.anchor4, that.ngtAnchors.moveAnchor], true);
			if (hitObject.length > 0) {
				var material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
				that.moveMode = false;
				switch (hitObject[0].object) {
					//Left Upper Corner
					case that.ngtAnchors.anchor1:
						that.ngtAnchors.hitAnchor = 1;
						that.ngtAnchors.anchor1.material = material;
						break;
					//Left Lower Corner
					case that.ngtAnchors.anchor2:
						that.ngtAnchors.hitAnchor = 2;
						that.ngtAnchors.anchor2.material = material;
						break;
					//Right Upper Corner
					case that.ngtAnchors.anchor3:
						that.ngtAnchors.hitAnchor = 3;
						that.ngtAnchors.anchor3.material = material;
						break;
					//Right Lower Corner
					case that.ngtAnchors.anchor4:
						that.ngtAnchors.hitAnchor = 4;
						that.ngtAnchors.anchor4.material = material;
						break;
					//Anchor in the middle of the View Finder	
					case that.ngtAnchors.moveAnchor:
						that.ngtAnchors.hitAnchor = 5;
						that.ngtAnchors.moveAnchor.material = material;
						that.viewFinderGrabbed = true;
						that.moveMode = false;
						break;	
					//No Anchor was hit		
					default:
						that.ngtAnchors.hitAnchor = 0;
						break;
				}
				material.dispose();
			}
		}

	};

	this.mouseMove = function (mouse) {
		if (that.userMouseDown && !that.buttonClicked) {
			that.calcMouseDrag(mouse);
		}

		that.lastMousePosition = new THREE.Vector2(mouse.x, mouse.y);
	};

	this.mouseUp = function () {
		that.userMouseDown = false;
		that.ngtAnchors.hitAnchor = 0;
		that.viewFinderGrabbed = false;
		that.ngtAnchors.calculateAngle();
		var material;
		if(that.ngtAnchors.tiltOutOfLimit){
			material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
		} else {
			material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		}
		that.ngtAnchors.anchor1.material = material;
		that.ngtAnchors.anchor2.material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		that.ngtAnchors.anchor3.material = material;
		that.ngtAnchors.anchor4.material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		that.ngtAnchors.moveAnchor.material = material;
		material.dispose();
		if(that.onChangeRect != undefined)
			that.onChangeRect();
	};

	this.outOfRangeColorChange = function () {
		var material;
		if(that.ngtAnchors.tiltOutOfLimit){
			material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
		} else {
			material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		}
		if(that.ngtAnchors.hitAnchor == 1){
			that.ngtAnchors.anchor1.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		} else {
			that.ngtAnchors.anchor1.material = material;
		}
		if(that.ngtAnchors.hitAnchor == 3){
			that.ngtAnchors.anchor3.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		} else {
			that.ngtAnchors.anchor3.material = material;
		}
		if(that.ngtAnchors.hitAnchor == 5){
			that.ngtAnchors.moveAnchor.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		} else {
			that.ngtAnchors.moveAnchor.material = material;
		}
		material.dispose();
	}
	
	this.calcMouseDrag = function (mouse) {
		that.mouseDragVector = new THREE.Vector2(mouse.x, mouse.y);
		that.mouseDragVector.subVectors(that.mouseDownPosition, that.mouseDragVector);
		that.mouseDragVector.y *= -1;
		that.mouseDragVector.multiplyScalar(0.2);
		that.mouseDragVector.add(that.oldMouseDragVector);
	};

	this.resizeWindow = function (width, height) {
		that.ngtCamera.camera.aspect = width/ height;
		that.ngtCamera.camera.updateProjectionMatrix();

		that.renderer.setSize(width, height);
	};

	this.createViewFinderFromCamera = function () {
		this.raycaster.set(new THREE.Vector3(0, 0, 0), this.target);
		var hit = this.raycaster.intersectObject(this.sphere)[0].point;
		var axis = this.target.clone().cross(new THREE.Vector3(0, 1, 0));
		var qxz = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 8);
		var qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8);

		this.startVector = hit.clone().applyQuaternion(qxz).applyQuaternion(qy);
		this.sizeVector = hit.clone().applyQuaternion(qxz.clone().conjugate()).applyQuaternion(qy.clone().conjugate());

		this.ngtRect.pictureSelect(this.startVector, this.sizeVector);
	};
	
	/**
	* The render functions that is called in every frame, draws and updates the scene
	*/
	this.render = function () {
		requestAnimationFrame(that.render);
		var pos1 = that.ngtAnchors.anchor1.position;
		var pos2 = that.ngtAnchors.anchor2.position;
		var pos3 = that.ngtAnchors.anchor3.position;
		var pos4 = that.ngtAnchors.anchor4.position;

		if ((that.mouseDragVector.x != 0 || that.mouseDragVector.y != 0) && !that.buttonClicked) {
			//Calculate a target vector on the sphere for the camera to look at based on the summed mouse drag movement
			//Since the sphere is halfed it cannot go over a certain degree on tilt value
			if (that.moveMode) {
				var alpha = Math.min(-5, Math.max(-80, that.mouseDragVector.y));
				var beta = THREE.Math.degToRad(90 - alpha);
				var gamma = THREE.Math.degToRad(that.mouseDragVector.x);

				var x, y, z;
				x = Math.sin(beta) * Math.cos(gamma) * (that.ngtCamera.camera.fov / that.ngtCamera.standardFov);
				y = Math.cos(beta) * (that.ngtCamera.camera.fov / that.ngtCamera.standardFov);
				z = Math.sin(beta) * Math.sin(gamma) * (that.ngtCamera.camera.fov / that.ngtCamera.standardFov);
				that.target = new THREE.Vector3(x, y, z).normalize();

				that.ngtCamera.camera.lookAt(that.target.clone().add(that.ngtCamera.camera.position));
			} else {
				//If the scene is not in move mode the user can either create a new viewfinder or alter the old one
				if (!that.viewFinderGrabbed) {
					//If no viewfinder but only the sphere was hit a new one will be created
						
					if (that.ngtAnchors.hitAnchor != 0) {
						//If an anchor was hit the viewfinders size will be altered while the position stays the same
						var mouseNDC = new THREE.Vector2(that.lastMousePosition.x / that.canvas.width * 2 - 1,
							((that.lastMousePosition.y) / that.canvas.height * 2 - 1) * -1);
						that.raycaster.setFromCamera(mouseNDC, that.ngtCamera.camera);
						if (that.raycaster.intersectObject(that.sphere).length > 0) {
							var hit = that.raycaster.intersectObject(that.sphere)[0].point.clone();
							var pos1Right = new THREE.Vector3(0, 1, 0).cross(pos1.clone().normalize()).multiplyScalar(-1).normalize();
							var width = new THREE.Vector2(pos3.x, pos3.z).sub(new THREE.Vector2(that.startVector.x, that.startVector.z))
								.dot(new THREE.Vector2(pos3.x, pos3.z).sub(new THREE.Vector2(hit.x, hit.z)));
							switch (that.ngtAnchors.hitAnchor) {
								case 1:

									if (hit.clone().normalize().sub(that.sizeVector.clone().normalize()).length() > 0.1 &&
										hit.y > pos2.y &&
										width > 0.2)
										that.startVector = hit;
									break;
								case 2:
									if (hit.clone().normalize().sub(that.sizeVector.clone().normalize()).length() > 0.1 &&
										width > 0) {
										var ay = new THREE.Vector3(hit.x, 0, hit.z).angleTo(new THREE.Vector3(pos2.x, 0, pos2.z));
										if (hit.x * pos2.z - hit.z * pos2.x < 0) {
											ay = Math.PI * 2 - ay;
										}
										var qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ay);
										that.startVector.applyQuaternion(qy);
									}


									var zeroVector = new THREE.Vector3(1, 0, 1).setLength(hit.length());
									var a1 = new THREE.Vector3(zeroVector.x, hit.y, zeroVector.z).angleTo(zeroVector);
									var a2 = new THREE.Vector3(zeroVector.x, pos2.y, zeroVector.z).angleTo(zeroVector);
									var axz = a2 - a1;

									var qxz = new THREE.Quaternion().setFromAxisAngle(that.sizeVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), axz);
									pos1Right = new THREE.Vector3(0, 1, 0).cross(that.startVector.clone().normalize()).multiplyScalar(-1).normalize();
									if (that.sizeVector.clone().applyQuaternion(qxz).y < pos3.y) {
										that.sizeVector.applyQuaternion(qxz);
									}

									break;
								case 3:
									width = new THREE.Vector2(that.startVector.x, that.startVector.z).sub(new THREE.Vector2(pos3.x, pos3.z))
										.dot(new THREE.Vector2(that.startVector.x, that.startVector.z).sub(new THREE.Vector2(hit.x, hit.z)));
									if (hit.clone().normalize().sub(that.startVector.clone().normalize()).length() > 0.02 &&
										width > 0) {
										ay = new THREE.Vector3(hit.x, 0, hit.z).angleTo(new THREE.Vector3(pos3.x, 0, pos3.z));

										if (ay >= 0.015) {
											if (hit.x * pos3.z - hit.z * pos3.x < 0) {
												ay = Math.PI * 2 - ay;
											}
											qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ay);
											that.sizeVector.applyQuaternion(qy);
										}
									}

									zeroVector = new THREE.Vector3(1, 0, 1).setLength(hit.length());
									a1 = new THREE.Vector3(zeroVector.x, hit.y, zeroVector.z).angleTo(zeroVector);
									a2 = new THREE.Vector3(zeroVector.x, pos3.y, zeroVector.z).angleTo(zeroVector);
									axz = a2 - a1;

									qxz = new THREE.Quaternion().setFromAxisAngle(that.startVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), axz);
									if (that.startVector.clone().applyQuaternion(qxz).y > pos2.y) {
										that.startVector.applyQuaternion(qxz);
									}

									break;
								case 4:
									width = new THREE.Vector2(that.startVector.x, that.startVector.z).sub(new THREE.Vector2(pos3.x, pos3.z))
										.dot(new THREE.Vector2(that.startVector.x, that.startVector.z).sub(new THREE.Vector2(hit.x, hit.z)));
									if (hit.clone().normalize().sub(that.startVector.clone().normalize()).length() > 0.02 &&
										width > 0 &&
										hit.y < pos3.y &&
										hit.y > -that.sphereRadius - 2) {
										ay = new THREE.Vector3(hit.x, 0, hit.z).angleTo(new THREE.Vector3(pos4.x, 0, pos4.z));

										if (ay >= 0.015) {
											if (hit.x * pos3.z - hit.z * pos3.x < 0) {
												ay = Math.PI * 2 - ay;
											}
											qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ay);
											that.sizeVector.applyQuaternion(qy);
										}
										
										zeroVector = new THREE.Vector3(1, 0, 1).setLength(hit.length());
										a1 = new THREE.Vector3(zeroVector.x, hit.y, zeroVector.z).angleTo(zeroVector);
										a2 = new THREE.Vector3(zeroVector.x, pos4.y, zeroVector.z).angleTo(zeroVector);
										axz = a2 - a1;

										qxz = new THREE.Quaternion().setFromAxisAngle(that.sizeVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), axz);
										that.sizeVector.applyQuaternion(qxz);
									}

									break;

								default:
									break;
							}
							that.raycaster.set(new THREE.Vector3(0, 0, 0), that.startVector.clone().normalize());
							if (that.raycaster.intersectObject(that.sphere).length > 0) {
								that.raycaster.set(new THREE.Vector3(0, 0, 0), that.sizeVector.clone().normalize());
								if (that.raycaster.intersectObject(that.sphere).length > 0) {
									that.ngtRect.pictureSelect(that.startVector, that.sizeVector);
								}
							}
						}
					}
				} else {
					//In this case the view finder is supposed to be altered but no anchor was hit.
					// The view finder will therefore be moved on the sphere
						
					/**
		 * Rotate the start and size vector on the sphere, so that the middle of the view finder gets moved to the new mouse position
		 */
					mouseNDC = new THREE.Vector2(that.lastMousePosition.x / that.canvas.width * 2 - 1,
						((that.lastMousePosition.y) / that.canvas.height * 2 - 1) * -1);
					that.raycaster.setFromCamera(mouseNDC, that.ngtCamera.camera);
					if (that.raycaster.intersectObject(that.sphere).length > 0) {
						var hit = that.raycaster.intersectObject(that.sphere)[0].point;
						var halfV = new THREE.Vector3().subVectors(that.sizeVector, that.startVector).multiplyScalar(0.5);
						halfV = that.ngtAnchors.moveAnchor.position;
						that.raycaster.set(new THREE.Vector3(0, 0, 0), halfV.clone().normalize());
						if (that.raycaster.intersectObject(that.sphere).length > 0) {
							var halfVectorHit = that.raycaster.intersectObject(that.sphere)[0].point;
								
								
							//Find the panning angle
							var yAngle = new THREE.Vector3(halfVectorHit.x, 0, halfVectorHit.z).angleTo(new THREE.Vector3(hit.x, 0, hit.z));
							if (halfVectorHit.x * hit.z - halfVectorHit.z * hit.x > 0) {
								yAngle = Math.PI * 2 - yAngle;
							}
								
							//Find the tilt angle
							var axis1 = that.startVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
							var axis2 = that.sizeVector.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

							var zeroVector = new THREE.Vector3(1, 0, 1).setLength(hit.length());
							var a1 = new THREE.Vector3(zeroVector.x, hit.y, zeroVector.z).angleTo(zeroVector);
							var a2 = new THREE.Vector3(zeroVector.x, halfVectorHit.y, zeroVector.z).angleTo(zeroVector);
							var angle;
							if (a1 < a2) {
								angle = a2 - a1;
							} else {
								angle = -(a1 - a2);
							}
								
								
							//Rotate the vectors using quaternions
							var qxz1 = new THREE.Quaternion().setFromAxisAngle(axis1, angle).normalize();
							var qxz2 = new THREE.Quaternion().setFromAxisAngle(axis2, angle).normalize();
							var qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yAngle).normalize();

							var qStart = qy.clone().multiply(qxz1).normalize();
							var qSize = qy.clone().multiply(qxz2).normalize();

							var safeStart = that.startVector.clone();
							that.startVector.applyQuaternion(qStart);

							var safeSize = that.sizeVector.clone();
							that.sizeVector.applyQuaternion(qSize);
								
								
							//If the sizevector is below the Y threshold rotate only on the y axis (right/left)
							var nY = new THREE.Vector3(0, -1, 0).setLength(that.sizeVector.length());

							if (that.sizeVector.y < nY.y + 0.05) {
								that.startVector = safeStart.clone().applyQuaternion(qy);
								that.sizeVector = safeSize.clone().applyQuaternion(qy);
							}


							that.raycaster.set(new THREE.Vector3(0, 0, 0), that.startVector.clone().normalize());
							if (that.raycaster.intersectObject(that.sphere).length > 0) {
								that.startVector = that.raycaster.intersectObject(that.sphere)[0].point;
								that.raycaster.set(new THREE.Vector3(0, 0, 0), that.sizeVector.clone().normalize());
								if (that.raycaster.intersectObject(that.sphere).length > 0) {
									that.sizeVector = that.raycaster.intersectObject(that.sphere)[0].point;
									that.ngtRect.pictureSelect(that.startVector, that.sizeVector);
								} else {
									that.startVector = safeStart;
									that.sizeVector = safeSize;
								}
							} else {
								that.startVector = safeStart;
								that.sizeVector = safeSize;
							}
						}

					}

				}
			}
		}
		that.renderer.render(that.scene, that.ngtCamera.camera);
	};
};

function NGTRect(scene, anchors) {

	this.ngtScene = scene;
	this.ngtAnchors = anchors;
	this.viewFinder = new THREE.Object3D(); //The viewfinder object, serves as a vessel for all the curve and sphere meshes of the finder
	
	/**
 * Creates the view finder
 * The start vector is the position on the sphere when the mouse was pressed and the anchor on the top left
 * The mouse vector normally is the current mouse position and gives the size of the view finder
 * 
 * A new view finder is created every time the function is called
 */
	this.pictureSelect = function (start, mouse) {
				
		//Delete the old view finder
		if (this.viewFinder != null) {
			this.ngtScene.scene.remove(this.viewFinder);
			//All children need to be manually disposed of, 
			//since the garbage collector will otherwise not be able to clean them up
			while (this.viewFinder.children.length > 0) {
				var obj = this.viewFinder.children[0];
				this.viewFinder.remove(obj);
				obj.material.dispose();
				obj.material = undefined;
				obj.geometry.dispose();
				obj.geometry = undefined;
				obj = undefined;
			}
			this.viewFinder = undefined;
		}

		this.viewFinder = new THREE.Object3D();
		//Save the start vector as the first anchor
		var pos1 = start.clone();
				
		//Find the width for horizontal curves and height for vertical curves
				
		var maxSteps = 800;
		var stepFactor = 0.2;
		var sphereDistanceFactor = 1;
		//Create the first curve between anchor1(top left) and anchor2(down left)
		var path1To2 = new Array();
		var pos2 = pos1.clone();
		path1To2.push(pos2.clone().multiplyScalar(sphereDistanceFactor));
		var distance = 990;
		var count = 0;
		//Calculate vector facing downward and do a raycast alongside this direction to find next position on the curve
		while (distance > 0.1 && count < maxSteps) {
			count++;
			var right = new THREE.Vector3(0, 1, 0).cross(pos2.clone().normalize()).normalize();
			var pos2Down = right.cross(pos2.clone().normalize()).normalize();
			var vec = pos2.clone().add(pos2Down.multiplyScalar(stepFactor));
			this.ngtScene.raycaster.set(new THREE.Vector3(0, 0, 0), vec.normalize());
			var obj = this.ngtScene.raycaster.intersectObject(this.ngtScene.sphere);
			if (obj.length > 0) {
				pos2 = obj[0].point;
				//Cannot be above or below the reference vectors
				if (pos2.y < mouse.y) {
					pos2.y = mouse.y;
				}
				if (pos2.y > start.y) {
					pos2.y = start.y;
				}
				path1To2.push(pos2.clone().multiplyScalar(sphereDistanceFactor));
				distance = pos2.y - mouse.y;
			}
		}
		var spline1 = new THREE.SplineCurve3(path1To2);

		var path1To3 = new Array();
		var pos3 = pos1.clone();
		path1To3.push(pos3.clone().multiplyScalar(sphereDistanceFactor));
		distance = 999;
		count = 0;
		var width = 0;
		//Calculate vector facing downward and do a raycast alongside this direction to find next position on the curve
		//Also finds anchor point 3 on the top left
		while (distance > 0.1 && count < maxSteps) {
			count++;
			var pos3Right = new THREE.Vector3(0, 1, 0).cross(pos3.clone().normalize()).multiplyScalar(-1).normalize();
			this.ngtScene.raycaster.set(new THREE.Vector3(0, 0, 0), pos3.clone().add(pos3Right.multiplyScalar(stepFactor)).normalize());
			obj = this.ngtScene.raycaster.intersectObject(this.ngtScene.sphere);
			if (obj.length > 0) {
				pos3 = obj[0].point;
				path1To3.push(pos3.clone().multiplyScalar(sphereDistanceFactor));
				distance = new THREE.Vector2(pos3.x, pos3.z).normalize().distanceTo(new THREE.Vector2(mouse.x, mouse.z).normalize());
				width += pos3.distanceTo(path1To3[path1To3.length - 2]);
			}
		}

		var spline2 = new THREE.SplineCurve3(path1To3);

		var path3To4 = new Array();
		var pos4 = pos3.clone();
		path3To4.push(pos4.clone().multiplyScalar(sphereDistanceFactor));
		distance = 999;
		count = 0;	
		//Calculate vector facing down and do a raycast alongside this direction to find next position on the curve
		//Also finds anchor point 4 on the down right	
		while (distance > 0.1 && count < maxSteps) {
			count++;
			right = new THREE.Vector3(0, 1, 0).cross(pos4.clone().normalize()).normalize();
			var pos4Down = right.cross(pos4.clone().normalize()).normalize();
			this.ngtScene.raycaster.set(new THREE.Vector3(0, 0, 0), pos4.clone().add(pos4Down.multiplyScalar(stepFactor)).normalize());
			obj = this.ngtScene.raycaster.intersectObject(this.ngtScene.sphere);
			if (obj.length > 0) {
				pos4 = obj[0].point;
				if (pos4.y < mouse.y) {
					pos4.y = mouse.y;
				}
				if (pos4.y > start.y) {
					pos4.y = start.y;
				}
				path3To4.push(pos4.clone().multiplyScalar(sphereDistanceFactor));
				distance = pos4.y - mouse.y

			}
		}
		var spline3 = new THREE.SplineCurve3(path3To4);
		var oldPos4 = pos4;
				
		//Since the lower curve will be smaller due to the smaller circle radius the diffrence between the two lengthes is calculated
		var path2To4 = new Array();
		pos4 = pos2.clone();
		path2To4.push(pos4.clone().multiplyScalar(sphereDistanceFactor));

		distance = 999;
		count = 0;
		//Calculate vector facing right and do a raycast alongside this direction to find next position on the curve
		while (distance > 0.1 && count < maxSteps) {
			count++;
			var pos4Right = new THREE.Vector3(0, 1, 0).cross(pos4.clone().normalize()).multiplyScalar(-1).normalize();
			this.ngtScene.raycaster.set(new THREE.Vector3(0, 0, 0), pos4.clone().add(pos4Right.multiplyScalar(stepFactor)).normalize());
			obj = this.ngtScene.raycaster.intersectObject(this.ngtScene.sphere);
			if (obj.length > 0) {
				var nextDistance = new THREE.Vector2(obj[0].point.x, obj[0].point.z).normalize().distanceTo(new THREE.Vector2(oldPos4.x, oldPos4.z).normalize());
				if (nextDistance > 0.1) {
					pos4 = obj[0].point;
					path2To4.push(pos4.clone().multiplyScalar(sphereDistanceFactor));
				} else {
					pos4 = oldPos4;
					path2To4.push(oldPos4);
					break;
				}
			}
			distance = new THREE.Vector2(pos4.x, pos4.z).normalize().distanceTo(new THREE.Vector2(oldPos4.x, oldPos4.z).normalize());
		}
		var spline4 = new THREE.SplineCurve3(path2To4);

		count = 0;
		distance = 999;
		var half = pos2.clone().sub(pos1).multiplyScalar(0.5).add(pos1);
		var pathToMiddle = new Array();
		var rightHalf = path3To4[Math.ceil(path3To4.length / 2 - 1)];
		pathToMiddle.push(half);
		//Approximately get the middle of the Viewfinder to place an anchor
		while (distance > 0.02 && count < 1000) {
			count++;
			var right = new THREE.Vector3(0, 1, 0).cross(half.clone().normalize()).multiplyScalar(-1).normalize();
			this.ngtScene.raycaster.set(new THREE.Vector3(0, 0, 0), half.clone().add(right.multiplyScalar(0.1)).normalize());
			obj = this.ngtScene.raycaster.intersectObject(this.ngtScene.sphere);
			if (obj.length > 0) {

				distance = new THREE.Vector2(half.x, half.z).normalize().distanceTo(new THREE.Vector2(rightHalf.x, rightHalf.z).normalize());
				half = obj[0].point;
				pathToMiddle.push(half);
			}
		}
		half = pathToMiddle[Math.ceil(pathToMiddle.length / 2 - 1)];
		//Create the meshes and adds them to the scene
		var material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		var geometry = new THREE.TubeGeometry(spline1, 64, 0.1);
		var mesh1 = new THREE.Mesh(geometry, material);
		this.viewFinder.add(mesh1);

		geometry = new THREE.TubeGeometry(spline2, 64, 0.1);
		var mesh2 = new THREE.Mesh(geometry, material);
		this.viewFinder.add(mesh2);

		geometry = new THREE.TubeGeometry(spline3, 64, 0.1);
		var mesh3 = new THREE.Mesh(geometry, material);
		this.viewFinder.add(mesh3);

		geometry = new THREE.TubeGeometry(spline4, 64, 0.1);
		var mesh4 = new THREE.Mesh(geometry, material);
		this.viewFinder.add(mesh4);

		geometry = new THREE.SphereGeometry(0.4);

		var materialGreen = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		if (this.ngtScene.ngtAnchors.hitAnchor == 1) {
			this.ngtScene.ngtAnchors.anchor1 = new THREE.Mesh(geometry, materialGreen);
		} else {
			this.ngtScene.ngtAnchors.anchor1 = new THREE.Mesh(geometry, material);
		}
		this.ngtScene.ngtAnchors.anchor1.position.set(pos1.x, pos1.y, pos1.z);
		this.viewFinder.add(this.ngtScene.ngtAnchors.anchor1);

		if (this.ngtScene.ngtAnchors.hitAnchor == 2) {
			this.ngtScene.ngtAnchors.anchor2 = new THREE.Mesh(geometry, materialGreen);
		} else {
			this.ngtScene.ngtAnchors.anchor2 = new THREE.Mesh(geometry, material);
		}
		this.ngtScene.ngtAnchors.anchor2.position.set(pos2.x, pos2.y, pos2.z);
		this.viewFinder.add(this.ngtScene.ngtAnchors.anchor2);

		if (this.ngtScene.ngtAnchors.hitAnchor == 3) {
			this.ngtScene.ngtAnchors.anchor3 = new THREE.Mesh(geometry, materialGreen);
		} else {
			this.ngtScene.ngtAnchors.anchor3 = new THREE.Mesh(geometry, material);
		}
		this.ngtScene.ngtAnchors.anchor3.position.set(pos3.x, pos3.y, pos3.z);
		this.viewFinder.add(this.ngtScene.ngtAnchors.anchor3);

		if (this.ngtScene.ngtAnchors.hitAnchor == 4) {
			this.ngtScene.ngtAnchors.anchor4 = new THREE.Mesh(geometry, materialGreen);
		} else {
			this.ngtScene.ngtAnchors.anchor4 = new THREE.Mesh(geometry, material);
		}
		this.ngtScene.ngtAnchors.anchor4.position.set(pos4.x, pos4.y, pos4.z);
		this.viewFinder.add(this.ngtScene.ngtAnchors.anchor4);

		geometry = new THREE.SphereGeometry(0.4);
		if (this.ngtScene.ngtAnchors.hitAnchor == 5) {
			this.ngtScene.ngtAnchors.moveAnchor = new THREE.Mesh(geometry, materialGreen);
		} else {
			this.ngtScene.ngtAnchors.moveAnchor = new THREE.Mesh(geometry, material);
		}
		this.ngtScene.ngtAnchors.moveAnchor.position.set(half.x, half.y, half.z);
		this.viewFinder.add(this.ngtScene.ngtAnchors.moveAnchor);

		this.ngtScene.scene.add(this.viewFinder);
		
		if(this.ngtScene.onChangeRect != undefined)
			this.ngtScene.onChangeRect();
	};
};

function NGTAnchors(scene) {
	//Anchor Points
	this.anchor1 = undefined;
	this.anchor2 = undefined;
	this.anchor3 = undefined;
	this.anchor4 = undefined; //The anchors of the view finder
	this.moveAnchor; //Anchor to move the view finder with
	this.hitAnchor = 0; //THe index of an anchor hit on mouse down (1-4)
	
	this.startPan = undefined;
	this.startTilt = undefined;
	this.endPan = undefined;
	this.endTilt = undefined; //the pan and tilt values between the zeroUvVertex and the viewfinder
	this.zeroUvVertex = undefined; //The vector pointing to the vertex with the smallest uv values
	
	this.tiltOutOfLimit = false;
	this.ngtScene = scene;

	this.calculateAngle = function () {
		var point;
		point = this.anchor1.position;
		this.startPan = THREE.Math.radToDeg(new THREE.Vector3(this.zeroUvVertex.x, 0, this.zeroUvVertex.z).angleTo(new THREE.Vector3(point.x, 0, point.z)));
		var dif = this.zeroUvVertex.x * point.z - this.zeroUvVertex.z * point.x;
		if (dif < 0) {
			this.startPan = 360 - this.startPan;
		}
		this.startTilt = THREE.Math.radToDeg(new THREE.Vector3(point.x, 0, point.z).angleTo(point));

		point = this.anchor4.position;
		this.endPan = THREE.Math.radToDeg(new THREE.Vector3(this.zeroUvVertex.x, 0, this.zeroUvVertex.z).angleTo(new THREE.Vector3(point.x, 0, point.z)));
		var dif = this.zeroUvVertex.x * point.z - this.zeroUvVertex.z * point.x;
		if (dif < 0) {
			this.endPan = 360 - this.endPan;
		}
		this.endTilt = THREE.Math.radToDeg(new THREE.Vector3(point.x, 0, point.z).angleTo(point));
	};

	this.findInitialUvVector = function () {
		var bestX = 999999;
		var bestY = 0;
		if(this.ngtScene.sphere.material == undefined || this.ngtScene.sphere.material.map == undefined){
			this.zeroUvVertex = this.ngtScene.sphere.geometry.vertices[0];
		}
		for (var i = 0; i < this.ngtScene.sphere.geometry.faces.length; i++) {
			for (var j = 0; j < this.ngtScene.sphere.geometry.faceVertexUvs[0][i].length; j++) {
				var uv = this.ngtScene.sphere.geometry.faceVertexUvs[0][i][j];
				if (uv.x < bestX || uv.y > bestY) {
					switch (j) {
						case 0:
							bestX = uv.x;
							bestY = uv.y;
							this.zeroUvVertex = this.ngtScene.sphere.geometry.vertices[this.ngtScene.sphere.geometry.faces[i].a];
							break;
						case 1:
							bestX = uv.x;
							bestY = uv.y;
							this.zeroUvVertex = this.ngtScene.sphere.geometry.vertices[this.ngtScene.sphere.geometry.faces[i].b];
							break;
						case 2:
							bestX = uv.x;
							bestY = uv.y;
							this.zeroUvVertex = this.ngtScene.sphere.geometry.vertices[this.ngtScene.sphere.geometry.faces[i].c];
							break;
					}
				}
			}

		}
		var quaternion = new THREE.Quaternion();
		quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -Math.PI * (1-bestX) );
		this.zeroUvVertex.applyQuaternion(quaternion);
		
		var xz = this.zeroUvVertex.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
		quaternion.setFromAxisAngle( xz, -Math.PI * (1-bestY) );
		this.zeroUvVertex.applyQuaternion(quaternion);
	};
	
	this.getAngles = function(){
		var a = new Array();
		a.push(this.startPan);
		a.push(this.startTilt);
		a.push(this.endPan);
		a.push(this.endTilt);
		return a;
	};
};

function NGTCamera(scene) {
	this.ngtScene = scene;
	this.maxFov = 120; //Maximum limit for the Camera zoom
	this.minFov = 30; //Minimum limit for the Camera zoom
	this.zoomStep = 1; //How much the zoom will be incremented/decremented in one step
	this.standardFov =  0.5 * this.maxFov + 0.5 * this.minFov; //The initial fov value
	this.camera = new THREE.PerspectiveCamera(this.standardFov, this.ngtScene.canvas.width / this.ngtScene.canvas.height, 1, 1000);
	this.currentPercentage;
	var that = this;

	this.moveCenter = function () {
		var prevTarget = that.ngtScene.target.clone().setLength(that.ngtScene.startVector.length());
		that.ngtScene.target = that.ngtScene.sizeVector.clone().sub(that.ngtScene.startVector).multiplyScalar(0.5).add(that.ngtScene.startVector).setLength(that.ngtScene.startVector.length());
		var downLength = new THREE.Vector3(0, -1, 0).setLength(that.ngtScene.startVector.length()).y;
		var x = THREE.Math.radToDeg(new THREE.Vector3(that.ngtScene.target.x, 0, that.ngtScene.target.z).angleTo(new THREE.Vector3(prevTarget.x, 0, prevTarget.z)));

		if (prevTarget.x * that.ngtScene.target.z - prevTarget.z * that.ngtScene.target.x < 0) {
			//right
			x = that.ngtScene.oldMouseDragVector.x - x;

		} else {
			//left
			x = that.ngtScene.oldMouseDragVector.x + x;
		}
		if (x > 360) {
			x -= 360;
		}
		if (x < -360) {
			x += 360;
		}
		var y = that.ngtScene.target.y / downLength * -80;
		that.ngtScene.mouseDragVector = new THREE.Vector2(x, y);
	};

	this.moveRight = function () {
		that.ngtScene.mouseDragVector.x += 10;
	};

	this.moveLeft = function () {
		that.ngtScene.mouseDragVector.x -= 10;
	};

	this.moveUp = function () {
		if (that.ngtScene.mouseDragVector.y + 5 < -5)
			that.ngtScene.mouseDragVector.y += 10;
	};

	this.moveDown = function () {
		if (that.ngtScene.mouseDragVector.y - 5 > -80)
			that.ngtScene.mouseDragVector.y -= 5;
	};

	this.setZoom = function (percentage) {
		var fov = percentage / 100 * that.maxFov + Math.abs(1 - percentage / 100) * that.minFov;
		if(fov >= that.minFov && fov <= that.maxFov){
			that.camera.fov = fov;
			that.camera.updateProjectionMatrix();
			that.currentPercentage = percentage;
		}
	};
	
	this.zoomIn = function(slider){
		var fov = that.camera.fov-that.zoomStep;
		var percent = (fov-that.minFov)/(that.maxFov-that.minFov) * 100;
		that.setZoom(percent,slider);
	}
	
	this.zoomOut = function(slider){
		var fov = that.camera.fov+that.zoomStep;
		var percent = (fov-that.minFov)/(that.maxFov-that.minFov) * 100;
		that.setZoom(percent,slider);
	}
	
	/*
	this.wheel = function (event,slider) {
		var initFov = that.camera.fov;
		// WebKit
		if (event.wheelDeltaY) {

			that.camera.fov -= event.wheelDeltaY * 0.005;

			// Opera / Explorer 9

		} else if (event.wheelDelta) {

			that.camera.fov -= event.wheelDelta * 0.005;

			// Firefox

		} else if (event.detail) {

			that.camera.fov += event.detail * 1.0;

		}

		if (that.camera.fov < that.minFov || that.camera.fov > that.maxFov) {
			that.camera.fov = initFov;
		}
		slider.value = (that.camera.fov-that.minFov)/(that.maxFov-that.minFov) * 100;
		that.camera.updateProjectionMatrix();
	};
	*/
};

halfSphereJson = '{"metadata":{"sourceFile": "halfSphere.max","generatedBy": "3ds max ThreeJSExporter","formatVersion": 3.1,"vertices": 260,"normals": 484,"colors": 0,"uvs": 300,"triangles": 484,"materials": 0},"vertices": [0.467963,-30.6393,-4.58928e-006,0.467963,-30.0572,5.90992,-0.685005,-30.0572,5.79636,-1.79367,-30.0572,5.46005,-2.81541,-30.0572,4.91392,-3.71098,-30.0572,4.17894,-4.44596,-30.0572,3.28337,-4.99209,-30.0572,2.26162,-5.3284,-30.0572,1.15296,-5.44196,-30.0572,-6.42709e-006,-5.3284,-30.0572,-1.15298,-4.99209,-30.0572,-2.26164,-4.44595,-30.0572,-3.28338,-3.71098,-30.0572,-4.17895,-2.81541,-30.0572,-4.91393,-1.79366,-30.0572,-5.46006,-0.685,-30.0572,-5.79637,0.467969,-30.0572,-5.90992,1.62094,-30.0572,-5.79637,2.7296,-30.0572,-5.46006,3.75135,-30.0572,-4.91392,4.64691,-30.0572,-4.17894,5.38189,-30.0572,-3.28337,5.92802,-30.0572,-2.26163,6.26433,-30.0572,-1.15296,6.37788,-30.0572,4.98614e-006,6.26432,-30.0572,1.15297,5.92801,-30.0572,2.26163,5.38188,-30.0572,3.28338,4.6469,-30.0572,4.17895,3.75133,-30.0572,4.91392,2.72958,-30.0572,5.46006,1.62092,-30.0572,5.79636,0.467963,-28.3334,11.5927,-1.79367,-28.3334,11.37,-3.96838,-28.3334,10.7103,-5.97261,-28.3334,9.639,-7.72933,-28.3334,8.19729,-9.17104,-28.3334,6.44057,-10.2423,-28.3334,4.43634,-10.902,-28.3334,2.26162,-11.1248,-28.3334,-8.01848e-006,-10.902,-28.3334,-2.26164,-10.2423,-28.3334,-4.43635,-9.17103,-28.3334,-6.44058,-7.72933,-28.3334,-8.19731,-5.9726,-28.3334,-9.63901,-3.96837,-28.3334,-10.7103,-1.79366,-28.3334,-11.37,0.467974,-28.3334,-11.5927,2.7296,-28.3334,-11.37,4.90432,-28.3334,-10.7103,6.90855,-28.3334,-9.639,8.66527,-28.3334,-8.19729,10.107,-28.3334,-6.44057,11.1783,-28.3334,-4.43633,11.8379,-28.3334,-2.26162,12.0607,-28.3334,1.43694e-005,11.8379,-28.3334,2.26164,11.1782,-28.3334,4.43636,10.107,-28.3334,6.44059,8.66524,-28.3334,8.19731,6.90852,-28.3334,9.63901,4.90429,-28.3334,10.7103,2.72957,-28.3334,11.37,0.467962,-25.534,16.83,-2.81541,-25.534,16.5066,-5.97261,-25.534,15.5489,-8.8823,-25.534,13.9937,-11.4327,-25.534,11.9006,-13.5257,-25.534,9.35026,-15.081,-25.534,6.44057,-16.0387,-25.534,3.28337,-16.3621,-25.534,-9.30232e-006,-16.0387,-25.534,-3.28339,-15.081,-25.534,-6.44059,-13.5257,-25.534,-9.35028,-11.4327,-25.534,-11.9006,-8.88229,-25.534,-13.9937,-5.9726,-25.534,-15.5489,-2.8154,-25.534,-16.5067,0.467979,-25.534,-16.83,3.75136,-25.534,-16.5066,6.90855,-25.534,-15.5489,9.81824,-25.534,-13.9937,12.3686,-25.534,-11.9006,14.4616,-25.534,-9.35025,16.0169,-25.534,-6.44056,16.9746,-25.534,-3.28335,17.298,-25.534,2.31998e-005,16.9746,-25.534,3.2834,16.0169,-25.534,6.4406,14.4616,-25.534,9.35029,12.3686,-25.534,11.9006,9.8182,-25.534,13.9937,6.9085,-25.534,15.5489,3.7513,-25.534,16.5066,0.467962,-21.7666,21.4206,-3.71098,-21.7666,21.009,-7.72933,-21.7666,19.79,-11.4327,-21.7666,17.8105,-14.6787,-21.7666,15.1466,-17.3426,-21.7666,11.9006,-19.3221,-21.7666,8.19729,-20.541,-21.7666,4.17894,-20.9526,-21.7666,-1.02292e-005,-20.541,-21.7666,-4.17896,-19.3221,-21.7666,-8.19731,-17.3426,-21.7666,-11.9006,-14.6787,-21.7666,-15.1466,-11.4327,-21.7666,-17.8106,-7.72932,-21.7666,-19.79,-3.71096,-21.7666,-21.009,0.467984,-21.7666,-21.4206,4.64693,-21.7666,-21.009,8.66528,-21.7666,-19.79,12.3686,-21.7666,-17.8105,15.6146,-21.7666,-15.1466,18.2785,-21.7666,-11.9006,20.258,-21.7666,-8.19727,21.4769,-21.7666,-4.17892,21.8885,-21.7666,3.11381e-005,21.4769,-21.7666,4.17898,20.258,-21.7666,8.19733,18.2785,-21.7666,11.9007,15.6146,-21.7666,15.1467,12.3686,-21.7666,17.8106,8.66522,-21.7666,19.79,4.64686,-21.7666,21.009,0.467962,-17.1761,25.1879,-4.44596,-17.1761,24.7039,-9.17104,-17.1761,23.2706,-13.5257,-17.1761,20.943,-17.3426,-17.1761,17.8105,-20.475,-17.1761,13.9937,-22.8026,-17.1761,9.63899,-24.236,-17.1761,4.91391,-24.72,-17.1761,-1.07637e-005,-24.236,-17.1761,-4.91393,-22.8026,-17.1761,-9.63901,-20.475,-17.1761,-13.9937,-17.3426,-17.1761,-17.8106,-13.5257,-17.1761,-20.943,-9.17102,-17.1761,-23.2706,-4.44593,-17.1761,-24.7039,0.467988,-17.1761,-25.1879,5.38191,-17.1761,-24.7039,10.107,-17.1761,-23.2706,14.4616,-17.1761,-20.943,18.2785,-17.1761,-17.8105,21.411,-17.1761,-13.9936,23.7386,-17.1761,-9.63897,25.1719,-17.1761,-4.91388,25.6559,-17.1761,3.78792e-005,25.1719,-17.1761,4.91396,23.7386,-17.1761,9.63904,21.4109,-17.1761,13.9937,18.2785,-17.1761,17.8106,14.4616,-17.1761,20.943,10.1069,-17.1761,23.2706,5.38183,-17.1761,24.704,0.467962,-11.9388,27.9873,-4.99209,-11.9388,27.4495,-10.2423,-11.9388,25.8569,-15.081,-11.9388,23.2706,-19.3221,-11.9388,19.79,-22.8026,-11.9388,15.5489,-25.389,-11.9388,10.7103,-26.9816,-11.9388,5.46005,-27.5194,-11.9388,-1.0885e-005,-26.9816,-11.9388,-5.46007,-25.3889,-11.9388,-10.7103,-22.8026,-11.9388,-15.5489,-19.322,-11.9388,-19.79,-15.0809,-11.9388,-23.2706,-10.2423,-11.9388,-25.8569,-4.99207,-11.9388,-27.4496,0.46799,-11.9388,-27.9873,5.92805,-11.9388,-27.4495,11.1783,-11.9388,-25.8569,16.0169,-11.9388,-23.2706,20.258,-11.9388,-19.79,23.7386,-11.9388,-15.5489,26.3249,-11.9388,-10.7102,27.9175,-11.9388,-5.46001,28.4553,-11.9388,4.31641e-005,27.9175,-11.9388,5.4601,26.3249,-11.9388,10.7103,23.7385,-11.9388,15.549,20.2579,-11.9388,19.7901,16.0168,-11.9388,23.2706,11.1782,-11.9388,25.8569,5.92796,-11.9388,27.4496,0.467962,-6.25598,29.7112,-5.3284,-6.25598,29.1403,-10.902,-6.25598,27.4496,-16.0387,-6.25598,24.7039,-20.541,-6.25597,21.009,-24.236,-6.25597,16.5066,-26.9816,-6.25597,11.37,-28.6723,-6.25597,5.79636,-29.2432,-6.25597,-1.05886e-005,-28.6723,-6.25597,-5.79638,-26.9816,-6.25597,-11.37,-24.236,-6.25597,-16.5067,-20.541,-6.25597,-21.009,-16.0387,-6.25597,-24.704,-10.902,-6.25597,-27.4496,-5.32837,-6.25597,-29.1403,0.467992,-6.25597,-29.7112,6.26436,-6.25597,-29.1403,11.838,-6.25597,-27.4495,16.9746,-6.25597,-24.7039,21.477,-6.25597,-21.0089,25.1719,-6.25597,-16.5066,27.9175,-6.25597,-11.3699,29.6083,-6.25597,-5.79632,30.1791,-6.25597,4.67895e-005,29.6082,-6.25597,5.79641,27.9175,-6.25597,11.37,25.1719,-6.25597,16.5067,21.4769,-6.25597,21.009,16.9746,-6.25598,24.704,11.8379,-6.25598,27.4496,6.26426,-6.25598,29.1403,0.467962,-0.346057,30.2933,-5.44196,-0.346056,29.7112,-11.1248,-0.346056,27.9873,-16.3621,-0.346056,25.1879,-20.9526,-0.346055,21.4206,-24.72,-0.346055,16.83,-27.5194,-0.346054,11.5927,-29.2432,-0.346053,5.90991,-29.8253,-0.346052,-9.88592e-006,-29.2432,-0.346051,-5.90993,-27.5193,-0.34605,-11.5927,-24.7199,-0.346049,-16.83,-20.9526,-0.346049,-21.4206,-16.362,-0.346048,-25.1879,-11.1247,-0.346048,-27.9873,-5.44193,-0.346047,-29.7112,0.467992,-0.346047,-30.2933,6.37792,-0.346047,-29.7112,12.0607,-0.346048,-27.9873,17.298,-0.346048,-25.1879,21.8886,-0.346049,-21.4205,25.6559,-0.346049,-16.83,28.4553,-0.34605,-11.5927,30.1791,-0.346051,-5.90988,30.7612,-0.346052,4.86164e-005,30.1791,-0.346053,5.90997,28.4553,-0.346054,11.5928,25.6559,-0.346055,16.8301,21.8885,-0.346055,21.4206,17.2979,-0.346056,25.188,12.0606,-0.346056,27.9873,6.37782,-0.346056,29.7112,0.467962,-0.346053,30.2933,-5.44196,-0.346053,29.7112,6.37782,-0.346053,29.7112], "normals": [-0.00965344,-0.995138,0.0980127,-0.0285892,-0.995138,0.0942461,-0.0464264,-0.995138,0.0868577,-0.0624794,-0.995138,0.0761314,-0.0761314,-0.995138,0.0624794,-0.0868577,-0.995138,0.0464264,-0.0942461,-0.995138,0.0285892,-0.0980127,-0.995138,0.00965339,-0.0980127,-0.995138,-0.00965343,-0.0942461,-0.995138,-0.0285893,-0.0868577,-0.995138,-0.0464264,-0.0761314,-0.995138,-0.0624795,-0.0624794,-0.995138,-0.0761315,-0.0464264,-0.995138,-0.0868577,-0.0285892,-0.995138,-0.0942461,-0.00965331,-0.995138,-0.0980127,0.00965351,-0.995138,-0.0980127,0.0285894,-0.995138,-0.0942461,0.0464265,-0.995138,-0.0868577,0.0624795,-0.995138,-0.0761313,0.0761315,-0.995138,-0.0624793,0.0868578,-0.995138,-0.0464263,0.0942462,-0.995138,-0.0285891,0.0980127,-0.995138,-0.00965327,0.0980127,-0.995138,0.00965355,0.094246,-0.995138,0.0285894,0.0868576,-0.995138,0.0464266,0.0761313,-0.995138,0.0624796,0.0624793,-0.995138,0.0761315,0.0464262,-0.995138,0.0868578,0.028589,-0.995138,0.0942462,0.0096533,-0.995138,0.0980127,-0.0285789,-0.95655,0.290166,-0.0285789,-0.95655,0.290166,-0.0846381,-0.95655,0.279015,-0.0846381,-0.95655,0.279015,-0.137445,-0.95655,0.257142,-0.137445,-0.95655,0.257141,-0.18497,-0.95655,0.225386,-0.18497,-0.95655,0.225386,-0.225386,-0.95655,0.18497,-0.225386,-0.95655,0.18497,-0.257142,-0.95655,0.137445,-0.257142,-0.95655,0.137444,-0.279015,-0.95655,0.0846381,-0.279015,-0.95655,0.0846381,-0.290166,-0.95655,0.0285788,-0.290166,-0.95655,0.0285788,-0.290166,-0.95655,-0.0285789,-0.290166,-0.95655,-0.0285789,-0.279015,-0.95655,-0.0846385,-0.279015,-0.95655,-0.0846385,-0.257142,-0.956549,-0.137445,-0.257141,-0.956549,-0.137446,-0.225387,-0.956549,-0.18497,-0.225387,-0.956549,-0.18497,-0.18497,-0.956549,-0.225387,-0.18497,-0.956549,-0.225387,-0.137445,-0.956549,-0.257142,-0.137445,-0.956549,-0.257142,-0.0846381,-0.956549,-0.279015,-0.084638,-0.956549,-0.279015,-0.0285786,-0.956549,-0.290166,-0.0285787,-0.956549,-0.290166,0.0285792,-0.956549,-0.290166,0.0285792,-0.956549,-0.290166,0.0846387,-0.956549,-0.279015,0.0846387,-0.956549,-0.279015,0.137445,-0.956549,-0.257142,0.137446,-0.956549,-0.257142,0.184971,-0.956549,-0.225387,0.184971,-0.956549,-0.225387,0.225387,-0.956549,-0.18497,0.225387,-0.956549,-0.18497,0.257142,-0.956549,-0.137445,0.257142,-0.956549,-0.137446,0.279015,-0.95655,-0.0846378,0.279015,-0.95655,-0.0846379,0.290166,-0.95655,-0.0285785,0.290166,-0.95655,-0.0285784,0.290166,-0.95655,0.0285793,0.290166,-0.95655,0.0285793,0.279015,-0.95655,0.0846389,0.279015,-0.95655,0.0846389,0.257141,-0.95655,0.137445,0.257142,-0.95655,0.137445,0.225386,-0.95655,0.18497,0.225386,-0.95655,0.18497,0.184969,-0.95655,0.225387,0.184969,-0.95655,0.225387,0.137444,-0.95655,0.257142,0.137444,-0.95655,0.257142,0.0846376,-0.95655,0.279015,0.0846377,-0.95655,0.279015,0.0285785,-0.95655,0.290166,0.0285785,-0.95655,0.290166,-0.0463787,-0.880972,0.47089,-0.0463787,-0.880972,0.47089,-0.137353,-0.880972,0.452794,-0.137353,-0.880972,0.452794,-0.22305,-0.880972,0.417297,-0.22305,-0.880972,0.417297,-0.300175,-0.880972,0.365764,-0.300175,-0.880972,0.365764,-0.365764,-0.880972,0.300175,-0.365764,-0.880972,0.300175,-0.417297,-0.880972,0.223049,-0.417297,-0.880972,0.22305,-0.452794,-0.880972,0.137353,-0.452794,-0.880972,0.137353,-0.47089,-0.880972,0.0463785,-0.47089,-0.880972,0.0463784,-0.47089,-0.880972,-0.0463787,-0.47089,-0.880972,-0.046379,-0.452794,-0.880972,-0.137354,-0.452794,-0.880972,-0.137354,-0.417297,-0.880972,-0.223051,-0.417297,-0.880972,-0.22305,-0.365764,-0.880972,-0.300175,-0.365764,-0.880972,-0.300175,-0.300174,-0.880972,-0.365764,-0.300174,-0.880972,-0.365764,-0.22305,-0.880972,-0.417297,-0.22305,-0.880972,-0.417297,-0.137353,-0.880972,-0.452794,-0.137353,-0.880972,-0.452794,-0.0463783,-0.880972,-0.47089,-0.0463782,-0.880972,-0.47089,0.0463791,-0.880972,-0.47089,0.046379,-0.880972,-0.47089,0.137354,-0.880972,-0.452794,0.137354,-0.880972,-0.452793,0.22305,-0.880972,-0.417297,0.22305,-0.880972,-0.417297,0.300175,-0.880972,-0.365763,0.300175,-0.880972,-0.365764,0.365764,-0.880972,-0.300174,0.365764,-0.880972,-0.300174,0.417297,-0.880972,-0.22305,0.417297,-0.880972,-0.223049,0.452794,-0.880972,-0.137353,0.452794,-0.880972,-0.137353,0.47089,-0.880972,-0.0463779,0.47089,-0.880972,-0.0463779,0.47089,-0.880972,0.0463793,0.47089,-0.880972,0.046379,0.452793,-0.880972,0.137354,0.452793,-0.880972,0.137354,0.417297,-0.880972,0.22305,0.417296,-0.880972,0.22305,0.365763,-0.880972,0.300175,0.365763,-0.880972,0.300175,0.300174,-0.880972,0.365764,0.300174,-0.880972,0.365764,0.223049,-0.880972,0.417297,0.223049,-0.880972,0.417297,0.137353,-0.880972,0.452794,0.137352,-0.880972,0.452794,0.046378,-0.880972,0.47089,0.0463781,-0.880972,0.47089,-0.0623609,-0.771506,0.633158,-0.0623607,-0.771506,0.633158,-0.184685,-0.771506,0.608827,-0.184685,-0.771506,0.608827,-0.299913,-0.771506,0.561098,-0.299913,-0.771506,0.561098,-0.403615,-0.771506,0.491806,-0.403615,-0.771506,0.491807,-0.491806,-0.771506,0.403615,-0.491806,-0.771506,0.403615,-0.561098,-0.771506,0.299913,-0.561098,-0.771506,0.299913,-0.608827,-0.771506,0.184685,-0.608827,-0.771506,0.184685,-0.633159,-0.771506,0.0623605,-0.633159,-0.771506,0.0623607,-0.633159,-0.771506,-0.0623612,-0.633159,-0.771506,-0.0623613,-0.608827,-0.771506,-0.184686,-0.608827,-0.771506,-0.184686,-0.561098,-0.771506,-0.299913,-0.561098,-0.771506,-0.299913,-0.491806,-0.771506,-0.403615,-0.491806,-0.771506,-0.403615,-0.403615,-0.771506,-0.491807,-0.403615,-0.771506,-0.491807,-0.299913,-0.771506,-0.561098,-0.299912,-0.771506,-0.561098,-0.184685,-0.771506,-0.608827,-0.184685,-0.771506,-0.608827,-0.0623601,-0.771506,-0.633159,-0.0623602,-0.771506,-0.633159,0.0623612,-0.771506,-0.633159,0.0623613,-0.771506,-0.633159,0.184686,-0.771506,-0.608827,0.184686,-0.771506,-0.608827,0.299914,-0.771506,-0.561098,0.299914,-0.771506,-0.561098,0.403616,-0.771506,-0.491806,0.403616,-0.771506,-0.491806,0.491807,-0.771506,-0.403615,0.491807,-0.771506,-0.403614,0.561098,-0.771506,-0.299912,0.561098,-0.771506,-0.299912,0.608827,-0.771506,-0.184685,0.608827,-0.771506,-0.184685,0.633159,-0.771506,-0.0623597,0.633159,-0.771506,-0.0623596,0.633159,-0.771506,0.0623612,0.633159,-0.771506,0.0623613,0.608827,-0.771506,0.184687,0.608826,-0.771506,0.184687,0.561098,-0.771506,0.299914,0.561097,-0.771506,0.299914,0.491806,-0.771506,0.403616,0.491806,-0.771506,0.403616,0.403614,-0.771506,0.491807,0.403614,-0.771506,0.491807,0.299912,-0.771506,0.561098,0.299912,-0.771506,0.561098,0.184684,-0.771506,0.608827,0.184684,-0.771506,0.608827,0.06236,-0.771506,0.633159,0.06236,-0.771506,0.633159,-0.0759153,-0.632563,0.77078,-0.0759154,-0.632563,0.770779,-0.224828,-0.632563,0.741159,-0.224828,-0.632563,0.741159,-0.365101,-0.632563,0.683056,-0.365101,-0.632563,0.683056,-0.491343,-0.632563,0.598704,-0.491343,-0.632563,0.598703,-0.598704,-0.632563,0.491343,-0.598704,-0.632563,0.491343,-0.683056,-0.632563,0.365101,-0.683056,-0.632563,0.365101,-0.741159,-0.632563,0.224828,-0.741159,-0.632563,0.224828,-0.77078,-0.632563,0.0759152,-0.77078,-0.632563,0.075915,-0.770779,-0.632563,-0.0759159,-0.77078,-0.632563,-0.0759156,-0.741159,-0.632563,-0.224829,-0.741159,-0.632563,-0.224829,-0.683056,-0.632563,-0.365101,-0.683056,-0.632563,-0.365101,-0.598703,-0.632563,-0.491344,-0.598703,-0.632563,-0.491344,-0.491343,-0.632562,-0.598704,-0.491343,-0.632563,-0.598704,-0.3651,-0.632563,-0.683057,-0.365101,-0.632562,-0.683057,-0.224828,-0.632563,-0.741159,-0.224828,-0.632563,-0.741159,-0.0759145,-0.632563,-0.77078,-0.0759145,-0.632563,-0.77078,0.0759159,-0.632563,-0.77078,0.075916,-0.632563,-0.77078,0.224829,-0.632562,-0.741159,0.224829,-0.632563,-0.741159,0.365102,-0.632562,-0.683056,0.365102,-0.632563,-0.683056,0.491344,-0.632563,-0.598703,0.491344,-0.632563,-0.598703,0.598704,-0.632563,-0.491342,0.598704,-0.632563,-0.491343,0.683056,-0.632563,-0.3651,0.683056,-0.632563,-0.3651,0.741159,-0.632563,-0.224827,0.741159,-0.632563,-0.224827,0.77078,-0.632563,-0.0759138,0.77078,-0.632563,-0.0759139,0.77078,-0.632563,0.0759159,0.77078,-0.632563,0.0759162,0.741158,-0.632563,0.22483,0.741159,-0.632563,0.224829,0.683055,-0.632563,0.365102,0.683055,-0.632563,0.365102,0.598703,-0.632563,0.491344,0.598703,-0.632563,0.491345,0.491342,-0.632563,0.598704,0.491343,-0.632563,0.598704,0.3651,-0.632563,0.683056,0.3651,-0.632563,0.683056,0.224826,-0.632563,0.741159,0.224827,-0.632563,0.741159,0.0759143,-0.632563,0.77078,0.0759141,-0.632563,0.770779,-0.0865361,-0.469628,0.878613,-0.086536,-0.469628,0.878613,-0.256282,-0.469628,0.844848,-0.256282,-0.469628,0.844848,-0.416179,-0.469628,0.778617,-0.416179,-0.469628,0.778617,-0.560083,-0.469628,0.682463,-0.560083,-0.469628,0.682463,-0.682463,-0.469629,0.560083,-0.682463,-0.469628,0.560083,-0.778617,-0.469629,0.416179,-0.778617,-0.469629,0.416179,-0.844848,-0.469628,0.256282,-0.844848,-0.469629,0.256281,-0.878613,-0.469628,0.0865357,-0.878613,-0.469628,0.0865358,-0.878613,-0.469628,-0.0865364,-0.878613,-0.469628,-0.0865366,-0.844848,-0.469629,-0.256283,-0.844848,-0.469628,-0.256282,-0.778617,-0.469628,-0.416179,-0.778616,-0.469629,-0.41618,-0.682463,-0.469628,-0.560084,-0.682463,-0.469628,-0.560083,-0.560082,-0.469629,-0.682464,-0.560082,-0.469628,-0.682464,-0.416179,-0.469629,-0.778617,-0.416179,-0.469629,-0.778617,-0.256281,-0.469628,-0.844849,-0.256281,-0.469629,-0.844849,-0.086535,-0.469628,-0.878613,-0.086535,-0.469628,-0.878613,0.0865367,-0.469628,-0.878613,0.0865369,-0.469628,-0.878613,0.256283,-0.469628,-0.844848,0.256283,-0.469628,-0.844848,0.41618,-0.469628,-0.778616,0.41618,-0.469628,-0.778616,0.560084,-0.469628,-0.682462,0.560084,-0.469628,-0.682463,0.682464,-0.469628,-0.560082,0.682464,-0.469629,-0.560082,0.778617,-0.469628,-0.416178,0.778617,-0.469629,-0.416178,0.844849,-0.469628,-0.256281,0.844849,-0.469628,-0.25628,0.878613,-0.469628,-0.0865343,0.878613,-0.469628,-0.0865348,0.878613,-0.469628,0.086537,0.878613,-0.469628,0.0865371,0.844848,-0.469629,0.256283,0.844848,-0.469628,0.256283,0.778616,-0.469629,0.416181,0.778616,-0.469629,0.416181,0.682462,-0.469628,0.560084,0.682462,-0.469629,0.560085,0.560082,-0.469628,0.682464,0.560082,-0.469628,0.682464,0.416178,-0.469628,0.778618,0.416178,-0.469628,0.778618,0.25628,-0.469628,0.844849,0.25628,-0.469628,0.844849,0.0865346,-0.469628,0.878613,0.0865348,-0.469628,0.878613,-0.0938347,-0.289004,0.952718,-0.0938346,-0.289004,0.952718,-0.277897,-0.289004,0.916106,-0.277897,-0.289004,0.916106,-0.451281,-0.289004,0.844288,-0.451281,-0.289004,0.844288,-0.607322,-0.289004,0.740024,-0.607323,-0.289004,0.740024,-0.740024,-0.289004,0.607322,-0.740024,-0.289004,0.607323,-0.844288,-0.289004,0.451281,-0.844288,-0.289004,0.451281,-0.916106,-0.289004,0.277897,-0.916106,-0.289004,0.277897,-0.952718,-0.289004,0.0938346,-0.952718,-0.289004,0.0938339,-0.952718,-0.289004,-0.0938354,-0.952718,-0.289004,-0.0938346,-0.916106,-0.289003,-0.277898,-0.916105,-0.289004,-0.277898,-0.844288,-0.289004,-0.451282,-0.844288,-0.289003,-0.451282,-0.740024,-0.289004,-0.607323,-0.740024,-0.289004,-0.607323,-0.607322,-0.289004,-0.740025,-0.607322,-0.289004,-0.740025,-0.451281,-0.289003,-0.844288,-0.451281,-0.289003,-0.844288,-0.277897,-0.289004,-0.916106,-0.277897,-0.289003,-0.916106,-0.0938337,-0.289004,-0.952718,-0.0938336,-0.289004,-0.952718,0.0938357,-0.289004,-0.952718,0.0938355,-0.289004,-0.952718,0.277899,-0.289004,-0.916106,0.277899,-0.289004,-0.916105,0.451282,-0.289004,-0.844287,0.451282,-0.289004,-0.844288,0.607323,-0.289003,-0.740024,0.607324,-0.289004,-0.740024,0.740025,-0.289004,-0.607322,0.740025,-0.289003,-0.607322,0.844289,-0.289004,-0.45128,0.844289,-0.289004,-0.45128,0.916106,-0.289004,-0.277896,0.916106,-0.289004,-0.277896,0.952718,-0.289004,-0.0938334,0.952718,-0.289004,-0.0938334,0.952718,-0.289004,0.0938359,0.952718,-0.289004,0.0938364,0.916105,-0.289004,0.277899,0.916105,-0.289004,0.277899,0.844287,-0.289004,0.451283,0.844287,-0.289004,0.451282,0.740023,-0.289004,0.607324,0.740023,-0.289004,0.607324,0.607321,-0.289004,0.740025,0.607321,-0.289004,0.740026,0.45128,-0.289004,0.844289,0.45128,-0.289004,0.844289,0.277896,-0.289004,0.916106,0.277896,-0.289004,0.916106,0.0938334,-0.289004,0.952718,0.0938334,-0.289004,0.952718,-0.0975498,-0.0975498,0.990438,-0.0975498,-0.0975498,0.990438,-0.2889,-0.0975498,0.952376,-0.2889,-0.0975497,0.952376,-0.469148,-0.0975495,0.877715,-0.469149,-0.0975498,0.877715,-0.631368,-0.0975498,0.769324,-0.631368,-0.0975495,0.769324,-0.769323,-0.0975495,0.631368,-0.769324,-0.0975498,0.631368,-0.877715,-0.0975493,0.469148,-0.877715,-0.0975495,0.469148,-0.952376,-0.0975498,0.2889,-0.952376,-0.0975492,0.2889,-0.990438,-0.0975498,0.097549,-0.990438,-0.0975498,0.0975491,-0.990438,-0.0975497,-0.0975497,-0.990438,-0.0975498,-0.0975497,-0.952376,-0.0975498,-0.288901,-0.952376,-0.0975497,-0.288901,-0.877715,-0.0975497,-0.469149,-0.877715,-0.0975498,-0.469149,-0.769323,-0.0975498,-0.631368,-0.769323,-0.0975497,-0.631368,-0.631367,-0.0975498,-0.769324,-0.631367,-0.0975498,-0.769324,-0.469148,-0.0975498,-0.877715,-0.469148,-0.0975498,-0.877715,-0.288899,-0.0975497,-0.952377,-0.288899,-0.0975498,-0.952377,-0.0975487,-0.0975498,-0.990438,-0.0975488,-0.0975497,-0.990438,0.0975507,-0.0975498,-0.990438,0.0975507,-0.0975498,-0.990438,0.288901,-0.0975499,-0.952376,0.288901,-0.0975498,-0.952376,0.469149,-0.0975495,-0.877715,0.46915,-0.0975499,-0.877715,0.631369,-0.09755,-0.769323,0.631369,-0.0975495,-0.769323,0.769324,-0.0975495,-0.631367,0.769325,-0.0975501,-0.631366,0.877716,-0.0975497,-0.469147,0.877716,-0.0975495,-0.469147,0.952377,-0.0975497,-0.288899,0.952377,-0.0975498,-0.288898,0.990438,-0.0975498,-0.0975484,0.990438,-0.0975497,-0.0975485,0.990438,-0.0975498,0.0975516,0.990438,-0.0975498,0.0975516,0.952376,-0.09755,0.288902,0.952376,-0.0975498,0.288902,0.877714,-0.0975497,0.46915,0.877714,-0.09755,0.46915,0.769322,-0.0975498,0.631369,0.769322,-0.0975497,0.631369,0.631366,-0.0975498,0.769325,0.631366,-0.0975498,0.769325,0.469147,-0.0975497,0.877716,0.469147,-0.0975498,0.877716,0.288898,-0.0975497,0.952377,0.288898,-0.0975497,0.952377,0.0975485,-0.0975498,0.990438,0.0975486,-0.0975497,0.990438,-0.0980173,0.0,0.995185,-0.0980173,0.0,0.995185,0.0980161,0.0,0.995185,0.0980161,0.0,0.995185], "colors": [], "uvs": [[0.00267901,0.00391116,0.0337616,0.00391116,0.0648441,0.00391116,0.0959267,0.00391116,0.127009,0.00391116,0.158092,0.00391116,0.189174,0.00391116,0.220257,0.00391116,0.251339,0.00391116,0.282422,0.00391116,0.313505,0.00391116,0.344587,0.00391116,0.37567,0.00391116,0.406752,0.00391116,0.437835,0.00391116,0.468917,0.00391116,0.5,0.00391116,0.531083,0.00391116,0.562165,0.00391116,0.593248,0.00391116,0.62433,0.00391116,0.655413,0.00391116,0.686495,0.00391116,0.717578,0.00391116,0.748661,0.00391116,0.779743,0.00391116,0.810826,0.00391116,0.841908,0.00391116,0.872991,0.00391116,0.904073,0.00391116,0.935156,0.00391116,0.966239,0.00391116,0.00267901,0.122554,0.0337616,0.122554,0.0648441,0.122554,0.0959267,0.122554,0.127009,0.122554,0.158092,0.122554,0.189174,0.122554,0.220257,0.122554,0.251339,0.122554,0.282422,0.122554,0.313505,0.122554,0.344587,0.122554,0.37567,0.122554,0.406752,0.122554,0.437835,0.122554,0.468917,0.122554,0.5,0.122554,0.531083,0.122554,0.562165,0.122554,0.593248,0.122554,0.62433,0.122554,0.655413,0.122554,0.686495,0.122554,0.717578,0.122554,0.748661,0.122554,0.779743,0.122554,0.810826,0.122554,0.841908,0.122554,0.872991,0.122554,0.904073,0.122554,0.935156,0.122554,0.966239,0.122554,0.997321,0.122554,0.00267901,0.24697,0.0337616,0.24697,0.0648441,0.24697,0.0959267,0.24697,0.127009,0.24697,0.158092,0.24697,0.189174,0.24697,0.220257,0.24697,0.251339,0.24697,0.282422,0.24697,0.313505,0.24697,0.344587,0.24697,0.37567,0.24697,0.406752,0.24697,0.437835,0.24697,0.468917,0.24697,0.5,0.24697,0.531083,0.24697,0.562165,0.24697,0.593248,0.24697,0.62433,0.24697,0.655413,0.24697,0.686495,0.24697,0.717578,0.24697,0.748661,0.24697,0.779743,0.24697,0.810826,0.24697,0.841908,0.24697,0.872991,0.24697,0.904073,0.24697,0.935156,0.24697,0.966239,0.24697,0.997321,0.24697,0.00267901,0.371385,0.0337616,0.371385,0.0648441,0.371385,0.0959267,0.371385,0.127009,0.371385,0.158092,0.371385,0.189174,0.371385,0.220257,0.371385,0.251339,0.371385,0.282422,0.371385,0.313505,0.371385,0.344587,0.371385,0.37567,0.371385,0.406752,0.371385,0.437835,0.371385,0.468917,0.371385,0.5,0.371385,0.531083,0.371385,0.562165,0.371385,0.593248,0.371385,0.62433,0.371385,0.655413,0.371385,0.686495,0.371385,0.717578,0.371385,0.748661,0.371385,0.779743,0.371385,0.810826,0.371385,0.841908,0.371385,0.872991,0.371385,0.904073,0.371385,0.935156,0.371385,0.966239,0.371385,0.997321,0.371385,0.00267901,0.4958,0.0337616,0.4958,0.0648441,0.4958,0.0959267,0.4958,0.127009,0.4958,0.158092,0.4958,0.189174,0.4958,0.220257,0.4958,0.251339,0.4958,0.282422,0.4958,0.313505,0.4958,0.344587,0.4958,0.37567,0.4958,0.406752,0.4958,0.437835,0.4958,0.468917,0.4958,0.5,0.4958,0.531083,0.4958,0.562165,0.4958,0.593248,0.4958,0.62433,0.4958,0.655413,0.4958,0.686495,0.4958,0.717578,0.4958,0.748661,0.4958,0.779743,0.4958,0.810826,0.4958,0.841908,0.4958,0.872991,0.4958,0.904073,0.4958,0.935156,0.4958,0.966239,0.4958,0.997321,0.4958,0.00267901,0.620216,0.0337616,0.620216,0.0648441,0.620216,0.0959267,0.620216,0.127009,0.620216,0.158092,0.620216,0.189174,0.620216,0.220257,0.620216,0.251339,0.620216,0.282422,0.620216,0.313505,0.620216,0.344587,0.620216,0.37567,0.620216,0.406752,0.620216,0.437835,0.620216,0.468917,0.620216,0.5,0.620216,0.531083,0.620216,0.562165,0.620216,0.593248,0.620216,0.62433,0.620216,0.655413,0.620216,0.686495,0.620216,0.717578,0.620216,0.748661,0.620216,0.779743,0.620216,0.810826,0.620216,0.841908,0.620216,0.872991,0.620216,0.904073,0.620216,0.935156,0.620216,0.966239,0.620216,0.997321,0.620216,0.00267901,0.744631,0.0337616,0.744631,0.0648441,0.744631,0.0959267,0.744631,0.127009,0.744631,0.158092,0.744631,0.189174,0.744631,0.220257,0.744631,0.251339,0.744631,0.282422,0.744631,0.313505,0.744631,0.344587,0.744631,0.37567,0.744631,0.406752,0.744631,0.437835,0.744631,0.468917,0.744631,0.5,0.744631,0.531083,0.744631,0.562165,0.744631,0.593248,0.744631,0.62433,0.744631,0.655413,0.744631,0.686495,0.744631,0.717578,0.744631,0.748661,0.744631,0.779743,0.744631,0.810826,0.744631,0.841908,0.744631,0.872991,0.744631,0.904073,0.744631,0.935156,0.744631,0.966239,0.744631,0.997321,0.744631,0.00267901,0.869047,0.0337616,0.869047,0.0648441,0.869047,0.0959267,0.869047,0.127009,0.869047,0.158092,0.869047,0.189174,0.869047,0.220257,0.869047,0.251339,0.869047,0.282422,0.869047,0.313505,0.869047,0.344587,0.869047,0.37567,0.869047,0.406752,0.869047,0.437835,0.869047,0.468917,0.869047,0.5,0.869047,0.531083,0.869047,0.562165,0.869047,0.593248,0.869047,0.62433,0.869047,0.655413,0.869047,0.686495,0.869047,0.717578,0.869047,0.748661,0.869047,0.779743,0.869047,0.810826,0.869047,0.841908,0.869047,0.872991,0.869047,0.904073,0.869047,0.935156,0.869047,0.966239,0.869047,0.997321,0.869047,0.00614309,0.986529,0.0372256,0.986529,0.0648441,0.993462,0.0959267,0.993462,0.127009,0.993462,0.158092,0.993462,0.189174,0.993462,0.220257,0.993462,0.251339,0.993462,0.282422,0.993462,0.313505,0.993462,0.344587,0.993462,0.37567,0.993462,0.406752,0.993462,0.437835,0.993462,0.468917,0.993462,0.5,0.993462,0.531083,0.993462,0.562165,0.993462,0.593248,0.993462,0.62433,0.993462,0.655413,0.993462,0.686495,0.993462,0.717578,0.993462,0.748661,0.993462,0.779743,0.993462,0.810826,0.993462,0.841908,0.993462,0.872991,0.993462,0.904073,0.993462,0.935156,0.993462,0.966239,0.993462,0.997321,0.993462,0.00346406,0.995746,0.0345466,0.995863,0.96696,0.996658,0.998043,0.996658]], "faces": [42,0,1,2,0,0,32,33,0,0,0,42,0,2,3,0,1,33,34,1,1,1,42,0,3,4,0,2,34,35,2,2,2,42,0,4,5,0,3,35,36,3,3,3,42,0,5,6,0,4,36,37,4,4,4,42,0,6,7,0,5,37,38,5,5,5,42,0,7,8,0,6,38,39,6,6,6,42,0,8,9,0,7,39,40,7,7,7,42,0,9,10,0,8,40,41,8,8,8,42,0,10,11,0,9,41,42,9,9,9,42,0,11,12,0,10,42,43,10,10,10,42,0,12,13,0,11,43,44,11,11,11,42,0,13,14,0,12,44,45,12,12,12,42,0,14,15,0,13,45,46,13,13,13,42,0,15,16,0,14,46,47,14,14,14,42,0,16,17,0,15,47,48,15,15,15,42,0,17,18,0,16,48,49,16,16,16,42,0,18,19,0,17,49,50,17,17,17,42,0,19,20,0,18,50,51,18,18,18,42,0,20,21,0,19,51,52,19,19,19,42,0,21,22,0,20,52,53,20,20,20,42,0,22,23,0,21,53,54,21,21,21,42,0,23,24,0,22,54,55,22,22,22,42,0,24,25,0,23,55,56,23,23,23,42,0,25,26,0,24,56,57,24,24,24,42,0,26,27,0,25,57,58,25,25,25,42,0,27,28,0,26,58,59,26,26,26,42,0,28,29,0,27,59,60,27,27,27,42,0,29,30,0,28,60,61,28,28,28,42,0,30,31,0,29,61,62,29,29,29,42,0,31,32,0,30,62,63,30,30,30,42,0,32,1,0,31,63,64,31,31,31,42,34,2,1,0,66,33,32,32,32,32,42,1,33,34,0,32,65,66,33,33,33,42,35,3,2,0,67,34,33,34,34,34,42,2,34,35,0,33,66,67,35,35,35,42,36,4,3,0,68,35,34,36,36,36,42,3,35,36,0,34,67,68,37,37,37,42,37,5,4,0,69,36,35,38,38,38,42,4,36,37,0,35,68,69,39,39,39,42,38,6,5,0,70,37,36,40,40,40,42,5,37,38,0,36,69,70,41,41,41,42,39,7,6,0,71,38,37,42,42,42,42,6,38,39,0,37,70,71,43,43,43,42,40,8,7,0,72,39,38,44,44,44,42,7,39,40,0,38,71,72,45,45,45,42,41,9,8,0,73,40,39,46,46,46,42,8,40,41,0,39,72,73,47,47,47,42,42,10,9,0,74,41,40,48,48,48,42,9,41,42,0,40,73,74,49,49,49,42,43,11,10,0,75,42,41,50,50,50,42,10,42,43,0,41,74,75,51,51,51,42,44,12,11,0,76,43,42,52,52,52,42,11,43,44,0,42,75,76,53,53,53,42,45,13,12,0,77,44,43,54,54,54,42,12,44,45,0,43,76,77,55,55,55,42,46,14,13,0,78,45,44,56,56,56,42,13,45,46,0,44,77,78,57,57,57,42,47,15,14,0,79,46,45,58,58,58,42,14,46,47,0,45,78,79,59,59,59,42,48,16,15,0,80,47,46,60,60,60,42,15,47,48,0,46,79,80,61,61,61,42,49,17,16,0,81,48,47,62,62,62,42,16,48,49,0,47,80,81,63,63,63,42,50,18,17,0,82,49,48,64,64,64,42,17,49,50,0,48,81,82,65,65,65,42,51,19,18,0,83,50,49,66,66,66,42,18,50,51,0,49,82,83,67,67,67,42,52,20,19,0,84,51,50,68,68,68,42,19,51,52,0,50,83,84,69,69,69,42,53,21,20,0,85,52,51,70,70,70,42,20,52,53,0,51,84,85,71,71,71,42,54,22,21,0,86,53,52,72,72,72,42,21,53,54,0,52,85,86,73,73,73,42,55,23,22,0,87,54,53,74,74,74,42,22,54,55,0,53,86,87,75,75,75,42,56,24,23,0,88,55,54,76,76,76,42,23,55,56,0,54,87,88,77,77,77,42,57,25,24,0,89,56,55,78,78,78,42,24,56,57,0,55,88,89,79,79,79,42,58,26,25,0,90,57,56,80,80,80,42,25,57,58,0,56,89,90,81,81,81,42,59,27,26,0,91,58,57,82,82,82,42,26,58,59,0,57,90,91,83,83,83,42,60,28,27,0,92,59,58,84,84,84,42,27,59,60,0,58,91,92,85,85,85,42,61,29,28,0,93,60,59,86,86,86,42,28,60,61,0,59,92,93,87,87,87,42,62,30,29,0,94,61,60,88,88,88,42,29,61,62,0,60,93,94,89,89,89,42,63,31,30,0,95,62,61,90,90,90,42,30,62,63,0,61,94,95,91,91,91,42,64,32,31,0,96,63,62,92,92,92,42,31,63,64,0,62,95,96,93,93,93,42,33,1,32,0,97,64,63,94,94,94,42,32,64,33,0,63,96,97,95,95,95,42,66,34,33,0,99,66,65,96,96,96,42,33,65,66,0,65,98,99,97,97,97,42,67,35,34,0,100,67,66,98,98,98,42,34,66,67,0,66,99,100,99,99,99,42,68,36,35,0,101,68,67,100,100,100,42,35,67,68,0,67,100,101,101,101,101,42,69,37,36,0,102,69,68,102,102,102,42,36,68,69,0,68,101,102,103,103,103,42,70,38,37,0,103,70,69,104,104,104,42,37,69,70,0,69,102,103,105,105,105,42,71,39,38,0,104,71,70,106,106,106,42,38,70,71,0,70,103,104,107,107,107,42,72,40,39,0,105,72,71,108,108,108,42,39,71,72,0,71,104,105,109,109,109,42,73,41,40,0,106,73,72,110,110,110,42,40,72,73,0,72,105,106,111,111,111,42,74,42,41,0,107,74,73,112,112,112,42,41,73,74,0,73,106,107,113,113,113,42,75,43,42,0,108,75,74,114,114,114,42,42,74,75,0,74,107,108,115,115,115,42,76,44,43,0,109,76,75,116,116,116,42,43,75,76,0,75,108,109,117,117,117,42,77,45,44,0,110,77,76,118,118,118,42,44,76,77,0,76,109,110,119,119,119,42,78,46,45,0,111,78,77,120,120,120,42,45,77,78,0,77,110,111,121,121,121,42,79,47,46,0,112,79,78,122,122,122,42,46,78,79,0,78,111,112,123,123,123,42,80,48,47,0,113,80,79,124,124,124,42,47,79,80,0,79,112,113,125,125,125,42,81,49,48,0,114,81,80,126,126,126,42,48,80,81,0,80,113,114,127,127,127,42,82,50,49,0,115,82,81,128,128,128,42,49,81,82,0,81,114,115,129,129,129,42,83,51,50,0,116,83,82,130,130,130,42,50,82,83,0,82,115,116,131,131,131,42,84,52,51,0,117,84,83,132,132,132,42,51,83,84,0,83,116,117,133,133,133,42,85,53,52,0,118,85,84,134,134,134,42,52,84,85,0,84,117,118,135,135,135,42,86,54,53,0,119,86,85,136,136,136,42,53,85,86,0,85,118,119,137,137,137,42,87,55,54,0,120,87,86,138,138,138,42,54,86,87,0,86,119,120,139,139,139,42,88,56,55,0,121,88,87,140,140,140,42,55,87,88,0,87,120,121,141,141,141,42,89,57,56,0,122,89,88,142,142,142,42,56,88,89,0,88,121,122,143,143,143,42,90,58,57,0,123,90,89,144,144,144,42,57,89,90,0,89,122,123,145,145,145,42,91,59,58,0,124,91,90,146,146,146,42,58,90,91,0,90,123,124,147,147,147,42,92,60,59,0,125,92,91,148,148,148,42,59,91,92,0,91,124,125,149,149,149,42,93,61,60,0,126,93,92,150,150,150,42,60,92,93,0,92,125,126,151,151,151,42,94,62,61,0,127,94,93,152,152,152,42,61,93,94,0,93,126,127,153,153,153,42,95,63,62,0,128,95,94,154,154,154,42,62,94,95,0,94,127,128,155,155,155,42,96,64,63,0,129,96,95,156,156,156,42,63,95,96,0,95,128,129,157,157,157,42,65,33,64,0,130,97,96,158,158,158,42,64,96,65,0,96,129,130,159,159,159,42,98,66,65,0,132,99,98,160,160,160,42,65,97,98,0,98,131,132,161,161,161,42,99,67,66,0,133,100,99,162,162,162,42,66,98,99,0,99,132,133,163,163,163,42,100,68,67,0,134,101,100,164,164,164,42,67,99,100,0,100,133,134,165,165,165,42,101,69,68,0,135,102,101,166,166,166,42,68,100,101,0,101,134,135,167,167,167,42,102,70,69,0,136,103,102,168,168,168,42,69,101,102,0,102,135,136,169,169,169,42,103,71,70,0,137,104,103,170,170,170,42,70,102,103,0,103,136,137,171,171,171,42,104,72,71,0,138,105,104,172,172,172,42,71,103,104,0,104,137,138,173,173,173,42,105,73,72,0,139,106,105,174,174,174,42,72,104,105,0,105,138,139,175,175,175,42,106,74,73,0,140,107,106,176,176,176,42,73,105,106,0,106,139,140,177,177,177,42,107,75,74,0,141,108,107,178,178,178,42,74,106,107,0,107,140,141,179,179,179,42,108,76,75,0,142,109,108,180,180,180,42,75,107,108,0,108,141,142,181,181,181,42,109,77,76,0,143,110,109,182,182,182,42,76,108,109,0,109,142,143,183,183,183,42,110,78,77,0,144,111,110,184,184,184,42,77,109,110,0,110,143,144,185,185,185,42,111,79,78,0,145,112,111,186,186,186,42,78,110,111,0,111,144,145,187,187,187,42,112,80,79,0,146,113,112,188,188,188,42,79,111,112,0,112,145,146,189,189,189,42,113,81,80,0,147,114,113,190,190,190,42,80,112,113,0,113,146,147,191,191,191,42,114,82,81,0,148,115,114,192,192,192,42,81,113,114,0,114,147,148,193,193,193,42,115,83,82,0,149,116,115,194,194,194,42,82,114,115,0,115,148,149,195,195,195,42,116,84,83,0,150,117,116,196,196,196,42,83,115,116,0,116,149,150,197,197,197,42,117,85,84,0,151,118,117,198,198,198,42,84,116,117,0,117,150,151,199,199,199,42,118,86,85,0,152,119,118,200,200,200,42,85,117,118,0,118,151,152,201,201,201,42,119,87,86,0,153,120,119,202,202,202,42,86,118,119,0,119,152,153,203,203,203,42,120,88,87,0,154,121,120,204,204,204,42,87,119,120,0,120,153,154,205,205,205,42,121,89,88,0,155,122,121,206,206,206,42,88,120,121,0,121,154,155,207,207,207,42,122,90,89,0,156,123,122,208,208,208,42,89,121,122,0,122,155,156,209,209,209,42,123,91,90,0,157,124,123,210,210,210,42,90,122,123,0,123,156,157,211,211,211,42,124,92,91,0,158,125,124,212,212,212,42,91,123,124,0,124,157,158,213,213,213,42,125,93,92,0,159,126,125,214,214,214,42,92,124,125,0,125,158,159,215,215,215,42,126,94,93,0,160,127,126,216,216,216,42,93,125,126,0,126,159,160,217,217,217,42,127,95,94,0,161,128,127,218,218,218,42,94,126,127,0,127,160,161,219,219,219,42,128,96,95,0,162,129,128,220,220,220,42,95,127,128,0,128,161,162,221,221,221,42,97,65,96,0,163,130,129,222,222,222,42,96,128,97,0,129,162,163,223,223,223,42,130,98,97,0,165,132,131,224,224,224,42,97,129,130,0,131,164,165,225,225,225,42,131,99,98,0,166,133,132,226,226,226,42,98,130,131,0,132,165,166,227,227,227,42,132,100,99,0,167,134,133,228,228,228,42,99,131,132,0,133,166,167,229,229,229,42,133,101,100,0,168,135,134,230,230,230,42,100,132,133,0,134,167,168,231,231,231,42,134,102,101,0,169,136,135,232,232,232,42,101,133,134,0,135,168,169,233,233,233,42,135,103,102,0,170,137,136,234,234,234,42,102,134,135,0,136,169,170,235,235,235,42,136,104,103,0,171,138,137,236,236,236,42,103,135,136,0,137,170,171,237,237,237,42,137,105,104,0,172,139,138,238,238,238,42,104,136,137,0,138,171,172,239,239,239,42,138,106,105,0,173,140,139,240,240,240,42,105,137,138,0,139,172,173,241,241,241,42,139,107,106,0,174,141,140,242,242,242,42,106,138,139,0,140,173,174,243,243,243,42,140,108,107,0,175,142,141,244,244,244,42,107,139,140,0,141,174,175,245,245,245,42,141,109,108,0,176,143,142,246,246,246,42,108,140,141,0,142,175,176,247,247,247,42,142,110,109,0,177,144,143,248,248,248,42,109,141,142,0,143,176,177,249,249,249,42,143,111,110,0,178,145,144,250,250,250,42,110,142,143,0,144,177,178,251,251,251,42,144,112,111,0,179,146,145,252,252,252,42,111,143,144,0,145,178,179,253,253,253,42,145,113,112,0,180,147,146,254,254,254,42,112,144,145,0,146,179,180,255,255,255,42,146,114,113,0,181,148,147,256,256,256,42,113,145,146,0,147,180,181,257,257,257,42,147,115,114,0,182,149,148,258,258,258,42,114,146,147,0,148,181,182,259,259,259,42,148,116,115,0,183,150,149,260,260,260,42,115,147,148,0,149,182,183,261,261,261,42,149,117,116,0,184,151,150,262,262,262,42,116,148,149,0,150,183,184,263,263,263,42,150,118,117,0,185,152,151,264,264,264,42,117,149,150,0,151,184,185,265,265,265,42,151,119,118,0,186,153,152,266,266,266,42,118,150,151,0,152,185,186,267,267,267,42,152,120,119,0,187,154,153,268,268,268,42,119,151,152,0,153,186,187,269,269,269,42,153,121,120,0,188,155,154,270,270,270,42,120,152,153,0,154,187,188,271,271,271,42,154,122,121,0,189,156,155,272,272,272,42,121,153,154,0,155,188,189,273,273,273,42,155,123,122,0,190,157,156,274,274,274,42,122,154,155,0,156,189,190,275,275,275,42,156,124,123,0,191,158,157,276,276,276,42,123,155,156,0,157,190,191,277,277,277,42,157,125,124,0,192,159,158,278,278,278,42,124,156,157,0,158,191,192,279,279,279,42,158,126,125,0,193,160,159,280,280,280,42,125,157,158,0,159,192,193,281,281,281,42,159,127,126,0,194,161,160,282,282,282,42,126,158,159,0,160,193,194,283,283,283,42,160,128,127,0,195,162,161,284,284,284,42,127,159,160,0,161,194,195,285,285,285,42,129,97,128,0,196,163,162,286,286,286,42,128,160,129,0,162,195,196,287,287,287,42,162,130,129,0,198,165,164,288,288,288,42,129,161,162,0,164,197,198,289,289,289,42,163,131,130,0,199,166,165,290,290,290,42,130,162,163,0,165,198,199,291,291,291,42,164,132,131,0,200,167,166,292,292,292,42,131,163,164,0,166,199,200,293,293,293,42,165,133,132,0,201,168,167,294,294,294,42,132,164,165,0,167,200,201,295,295,295,42,166,134,133,0,202,169,168,296,296,296,42,133,165,166,0,168,201,202,297,297,297,42,167,135,134,0,203,170,169,298,298,298,42,134,166,167,0,169,202,203,299,299,299,42,168,136,135,0,204,171,170,300,300,300,42,135,167,168,0,170,203,204,301,301,301,42,169,137,136,0,205,172,171,302,302,302,42,136,168,169,0,171,204,205,303,303,303,42,170,138,137,0,206,173,172,304,304,304,42,137,169,170,0,172,205,206,305,305,305,42,171,139,138,0,207,174,173,306,306,306,42,138,170,171,0,173,206,207,307,307,307,42,172,140,139,0,208,175,174,308,308,308,42,139,171,172,0,174,207,208,309,309,309,42,173,141,140,0,209,176,175,310,310,310,42,140,172,173,0,175,208,209,311,311,311,42,174,142,141,0,210,177,176,312,312,312,42,141,173,174,0,176,209,210,313,313,313,42,175,143,142,0,211,178,177,314,314,314,42,142,174,175,0,177,210,211,315,315,315,42,176,144,143,0,212,179,178,316,316,316,42,143,175,176,0,178,211,212,317,317,317,42,177,145,144,0,213,180,179,318,318,318,42,144,176,177,0,179,212,213,319,319,319,42,178,146,145,0,214,181,180,320,320,320,42,145,177,178,0,180,213,214,321,321,321,42,179,147,146,0,215,182,181,322,322,322,42,146,178,179,0,181,214,215,323,323,323,42,180,148,147,0,216,183,182,324,324,324,42,147,179,180,0,182,215,216,325,325,325,42,181,149,148,0,217,184,183,326,326,326,42,148,180,181,0,183,216,217,327,327,327,42,182,150,149,0,218,185,184,328,328,328,42,149,181,182,0,184,217,218,329,329,329,42,183,151,150,0,219,186,185,330,330,330,42,150,182,183,0,185,218,219,331,331,331,42,184,152,151,0,220,187,186,332,332,332,42,151,183,184,0,186,219,220,333,333,333,42,185,153,152,0,221,188,187,334,334,334,42,152,184,185,0,187,220,221,335,335,335,42,186,154,153,0,222,189,188,336,336,336,42,153,185,186,0,188,221,222,337,337,337,42,187,155,154,0,223,190,189,338,338,338,42,154,186,187,0,189,222,223,339,339,339,42,188,156,155,0,224,191,190,340,340,340,42,155,187,188,0,190,223,224,341,341,341,42,189,157,156,0,225,192,191,342,342,342,42,156,188,189,0,191,224,225,343,343,343,42,190,158,157,0,226,193,192,344,344,344,42,157,189,190,0,192,225,226,345,345,345,42,191,159,158,0,227,194,193,346,346,346,42,158,190,191,0,193,226,227,347,347,347,42,192,160,159,0,228,195,194,348,348,348,42,159,191,192,0,194,227,228,349,349,349,42,161,129,160,0,229,196,195,350,350,350,42,160,192,161,0,195,228,229,351,351,351,42,194,162,161,0,231,198,197,352,352,352,42,161,193,194,0,197,230,231,353,353,353,42,195,163,162,0,232,199,198,354,354,354,42,162,194,195,0,198,231,232,355,355,355,42,196,164,163,0,233,200,199,356,356,356,42,163,195,196,0,199,232,233,357,357,357,42,197,165,164,0,234,201,200,358,358,358,42,164,196,197,0,200,233,234,359,359,359,42,198,166,165,0,235,202,201,360,360,360,42,165,197,198,0,201,234,235,361,361,361,42,199,167,166,0,236,203,202,362,362,362,42,166,198,199,0,202,235,236,363,363,363,42,200,168,167,0,237,204,203,364,364,364,42,167,199,200,0,203,236,237,365,365,365,42,201,169,168,0,238,205,204,366,366,366,42,168,200,201,0,204,237,238,367,367,367,42,202,170,169,0,239,206,205,368,368,368,42,169,201,202,0,205,238,239,369,369,369,42,203,171,170,0,240,207,206,370,370,370,42,170,202,203,0,206,239,240,371,371,371,42,204,172,171,0,241,208,207,372,372,372,42,171,203,204,0,207,240,241,373,373,373,42,205,173,172,0,242,209,208,374,374,374,42,172,204,205,0,208,241,242,375,375,375,42,206,174,173,0,243,210,209,376,376,376,42,173,205,206,0,209,242,243,377,377,377,42,207,175,174,0,244,211,210,378,378,378,42,174,206,207,0,210,243,244,379,379,379,42,208,176,175,0,245,212,211,380,380,380,42,175,207,208,0,211,244,245,381,381,381,42,209,177,176,0,246,213,212,382,382,382,42,176,208,209,0,212,245,246,383,383,383,42,210,178,177,0,247,214,213,384,384,384,42,177,209,210,0,213,246,247,385,385,385,42,211,179,178,0,248,215,214,386,386,386,42,178,210,211,0,214,247,248,387,387,387,42,212,180,179,0,249,216,215,388,388,388,42,179,211,212,0,215,248,249,389,389,389,42,213,181,180,0,250,217,216,390,390,390,42,180,212,213,0,216,249,250,391,391,391,42,214,182,181,0,251,218,217,392,392,392,42,181,213,214,0,217,250,251,393,393,393,42,215,183,182,0,252,219,218,394,394,394,42,182,214,215,0,218,251,252,395,395,395,42,216,184,183,0,253,220,219,396,396,396,42,183,215,216,0,219,252,253,397,397,397,42,217,185,184,0,254,221,220,398,398,398,42,184,216,217,0,220,253,254,399,399,399,42,218,186,185,0,255,222,221,400,400,400,42,185,217,218,0,221,254,255,401,401,401,42,219,187,186,0,256,223,222,402,402,402,42,186,218,219,0,222,255,256,403,403,403,42,220,188,187,0,257,224,223,404,404,404,42,187,219,220,0,223,256,257,405,405,405,42,221,189,188,0,258,225,224,406,406,406,42,188,220,221,0,224,257,258,407,407,407,42,222,190,189,0,259,226,225,408,408,408,42,189,221,222,0,225,258,259,409,409,409,42,223,191,190,0,260,227,226,410,410,410,42,190,222,223,0,226,259,260,411,411,411,42,224,192,191,0,261,228,227,412,412,412,42,191,223,224,0,227,260,261,413,413,413,42,193,161,192,0,262,229,228,414,414,414,42,192,224,193,0,228,261,262,415,415,415,42,226,194,193,0,264,231,230,416,416,416,42,193,225,226,0,230,263,264,417,417,417,42,227,195,194,0,265,232,231,418,418,418,42,194,226,227,0,231,264,265,419,419,419,42,228,196,195,0,266,233,232,420,420,420,42,195,227,228,0,232,265,266,421,421,421,42,229,197,196,0,267,234,233,422,422,422,42,196,228,229,0,233,266,267,423,423,423,42,230,198,197,0,268,235,234,424,424,424,42,197,229,230,0,234,267,268,425,425,425,42,231,199,198,0,269,236,235,426,426,426,42,198,230,231,0,235,268,269,427,427,427,42,232,200,199,0,270,237,236,428,428,428,42,199,231,232,0,236,269,270,429,429,429,42,233,201,200,0,271,238,237,430,430,430,42,200,232,233,0,237,270,271,431,431,431,42,234,202,201,0,272,239,238,432,432,432,42,201,233,234,0,238,271,272,433,433,433,42,235,203,202,0,273,240,239,434,434,434,42,202,234,235,0,239,272,273,435,435,435,42,236,204,203,0,274,241,240,436,436,436,42,203,235,236,0,240,273,274,437,437,437,42,237,205,204,0,275,242,241,438,438,438,42,204,236,237,0,241,274,275,439,439,439,42,238,206,205,0,276,243,242,440,440,440,42,205,237,238,0,242,275,276,441,441,441,42,239,207,206,0,277,244,243,442,442,442,42,206,238,239,0,243,276,277,443,443,443,42,240,208,207,0,278,245,244,444,444,444,42,207,239,240,0,244,277,278,445,445,445,42,241,209,208,0,279,246,245,446,446,446,42,208,240,241,0,245,278,279,447,447,447,42,242,210,209,0,280,247,246,448,448,448,42,209,241,242,0,246,279,280,449,449,449,42,243,211,210,0,281,248,247,450,450,450,42,210,242,243,0,247,280,281,451,451,451,42,244,212,211,0,282,249,248,452,452,452,42,211,243,244,0,248,281,282,453,453,453,42,245,213,212,0,283,250,249,454,454,454,42,212,244,245,0,249,282,283,455,455,455,42,246,214,213,0,284,251,250,456,456,456,42,213,245,246,0,250,283,284,457,457,457,42,247,215,214,0,285,252,251,458,458,458,42,214,246,247,0,251,284,285,459,459,459,42,248,216,215,0,286,253,252,460,460,460,42,215,247,248,0,252,285,286,461,461,461,42,249,217,216,0,287,254,253,462,462,462,42,216,248,249,0,253,286,287,463,463,463,42,250,218,217,0,288,255,254,464,464,464,42,217,249,250,0,254,287,288,465,465,465,42,251,219,218,0,289,256,255,466,466,466,42,218,250,251,0,255,288,289,467,467,467,42,252,220,219,0,290,257,256,468,468,468,42,219,251,252,0,256,289,290,469,469,469,42,253,221,220,0,291,258,257,470,470,470,42,220,252,253,0,257,290,291,471,471,471,42,254,222,221,0,292,259,258,472,472,472,42,221,253,254,0,258,291,292,473,473,473,42,255,223,222,0,293,260,259,474,474,474,42,222,254,255,0,259,292,293,475,475,475,42,256,224,223,0,294,261,260,476,476,476,42,223,255,256,0,260,293,294,477,477,477,42,225,193,224,0,295,262,261,478,478,478,42,224,256,225,0,261,294,295,479,479,479,42,258,226,225,0,297,264,263,480,480,480,42,225,257,258,0,263,296,297,481,481,481,42,257,225,256,0,299,295,294,482,482,482,42,256,259,257,0,294,298,299,483,483,483]}';