module = angular.module('ngThreenorama',[])

module.service('ngThreenorama', -> new NGTScene())

module.directive 'ngThreenorama' , (ngThreenorama, $window, $rootScope) ->
	directive =
		transclude: true 
		scope:
			src: '='
			zoom: '='
			zoomStep: '='
			start: '='
			end: '='
			xGeneric: '='
			yGeneric: '='
			sensor: '='
			zoomAbsolute: '='
			zoomGeneric: '='
			pictureOverlap: '='
			panoramaZoom: '='
            
		link:(scope,element,attrs,ctrl,transcludeFn) ->
			scope.zoomStep ?= 1
			scope.zoom ?= 50
			scope.start ?= 
				tilt: 0
				pan: 0
			scope.end ?=
				tilt: 0
				pan: 0
			scope.panoramaZoom ?= document.getElementById("zoom").value
			scope.pictureOverlap ?= document.getElementById("pictureCoverage").value

			scope.xGeneric ?=
				xMin: document.getElementById("xMin").value
				xMax: document.getElementById("xMax").value
			
			scope.yGeneric ?=
				yMin: document.getElementById("yMin").value
				yMax: document.getElementById("yMax").value
			
			scope.sensor ?=
				width: document.getElementById("sensorWidth").value
				height: document.getElementById("sensorHeight").value
			
			scope.zoomAbsolute ?=
				min: document.getElementById("minFocal").value
				max: document.getElementById("maxFocal").value
				
			scope.zoomGeneric ?=
				min: document.getElementById("minZoom").value
				max: document.getElementById("maxZoom").value

			cameraValuesChanged = ->
				updateAngles()

			scope.moveCenter = ->
				ngThreenorama.ngtCamera.moveCenter()
				
			scope.moveUp = ->
				ngThreenorama.ngtCamera.moveUp()
			
			scope.moveDown = ->
				ngThreenorama.ngtCamera.moveDown()
				
			scope.moveLeft = ->
				ngThreenorama.ngtCamera.moveLeft()
				
			scope.moveRight = ->
				ngThreenorama.ngtCamera.moveRight()
				
			scope.zoomIn = ->
				scope.zoom -= scope.zoomStep
			
			scope.zoomOut = ->
				scope.zoom += scope.zoomStep
						
			scope.sliderChange = ->
				scope.zoom = scope.sliderValue
			
			scope.singlePicture = ->
				minFocal = document.getElementById("minFocal").value
				maxFocal = document.getElementById("maxFocal").value
				focalDistance = 1 * minFocal + ((maxFocal - minFocal) * (document.getElementById("zoom").value / 100))
				panAngle = Math.atan(document.getElementById("sensorWidth").value / (2 * focalDistance))
				tiltAngle = Math.atan(document.getElementById("sensorHeight").value / (2 * focalDistance))
				ngThreenorama.setViewFinderToSinglePicture(panAngle * 2,tiltAngle)
				updateAngles()
					
			sourceChanged = ->
				ngThreenorama.changeImage(scope.src)
			resize = ->
				ngThreenorama.resizeWindow(element[0].clientWidth,element[0].clientHeight)
				
			zoomChanged = ->
				ngThreenorama.ngtCamera.setZoom(scope.zoom)
				scope.sliderValue = scope.zoom
			
			getMousePos = (event) ->
				x = event.pageX - element[0].offsetLeft - element[0].offsetParent.offsetLeft
				y = event.pageY - element[0].offsetTop - element[0].offsetParent.offsetTop
				return [x,y]
				
			mouseDown = (event) ->
				xy = getMousePos(event)
				ngThreenorama.mouseDown(new THREE.Vector2(xy[0],xy[1]))
			
			mouseUp = (event) ->
				xy = getMousePos(event)
				ngThreenorama.mouseUp(new THREE.Vector2(xy[0],xy[1]))
				
			mouseMove = (event) ->
				xy = getMousePos(event)
				ngThreenorama.mouseMove(new THREE.Vector2(xy[0],xy[1]))
			
			mouseDrag = (event) ->
				xy = getMousePos(event)
				ngThreenorama.mouseDrag(new THREE.Vector2(xy[0],xy[1]))
			
			updateAngles = (event) ->
				minFocal = 0.0
				maxFocal = 0.0
				minFocal = document.getElementById("minFocal").value
				maxFocal = document.getElementById("maxFocal").value
				focalDistance = 1 * minFocal + ((maxFocal - minFocal) * (document.getElementById("zoom").value / 100))
				panAngle = Math.atan(document.getElementById("sensorWidth").value / (2 * focalDistance)) * (180 / Math.PI)
				tiltAngle = Math.atan(document.getElementById("sensorHeight").value / (2 * focalDistance)) * (180 / Math.PI)
				
				minZoomWidth = Math.atan(document.getElementById("sensorWidth").value / (2 * minFocal)) * (180 / Math.PI)
				minZoomHeight = Math.atan(document.getElementById("sensorHeight").value / (2 * minFocal)) * (180 / Math.PI)
				
				pictureCoverage = 1 - document.getElementById("pictureCoverage").value / 100
				xDelta = (panAngle * pictureCoverage / 360 * scope.xGeneric.xMin + panAngle * pictureCoverage / 360 * scope.xGeneric.xMax)
				yDelta = (tiltAngle * pictureCoverage / 180 * scope.yGeneric.yMin + tiltAngle * pictureCoverage / 180 * scope.yGeneric.yMax)
				
					
				startX = ngThreenorama.ngtAnchors.startPan - minZoomWidth / 2
				if startX < 0
					startX = 360 + startX
				startY = ngThreenorama.ngtAnchors.startTilt - minZoomHeight / 2
				endX = ngThreenorama.ngtAnchors.endPan - minZoomWidth / 2
				if endX < 0
					endX = 360 + endX
				endY = ngThreenorama.ngtAnchors.endTilt - minZoomHeight / 2

				scope.start.pan = (startX + panAngle / 2) % 360
				scope.start.tilt = startY + tiltAngle / 2
				scope.end.pan = (endX - panAngle / 2) % 360
				scope.end.tilt = endY - tiltAngle / 2
				
				if (ngThreenorama.ngtAnchors.startPan + panAngle >= ngThreenorama.ngtAnchors.endPan &&
				ngThreenorama.ngtAnchors.startPan < ngThreenorama.ngtAnchors.endPan) ||
				(ngThreenorama.ngtAnchors.endPan + panAngle >= ngThreenorama.ngtAnchors.startPan &&
				ngThreenorama.ngtAnchors.endPan < ngThreenorama.ngtAnchors.startPan)
					scope.end.pan = scope.start.pan
				
				if (ngThreenorama.ngtAnchors.startTilt + tiltAngle >= ngThreenorama.ngtAnchors.endTilt &&
				ngThreenorama.ngtAnchors.startTilt < ngThreenorama.ngtAnchors.endTilt) ||
				(ngThreenorama.ngtAnchors.endTilt + tiltAngle >= ngThreenorama.ngtAnchors.startTilt &&
				ngThreenorama.ngtAnchors.endTilt < ngThreenorama.ngtAnchors.startTilt)
					scope.end.tilt = scope.start.tilt
				
				scope.start.pan = scope.start.pan / 360 * scope.xGeneric.xMin + scope.start.pan / 360 * scope.xGeneric.xMax 
				scope.start.tilt = scope.start.tilt / 180 * scope.yGeneric.yMin + scope.start.tilt / 180 * scope.yGeneric.yMax 
				if scope.start.tilt > 0
					scope.start.tilt = 0
					ngThreenorama.ngtAnchors.tiltOutOfLimit = true
				else
					ngThreenorama.ngtAnchors.tiltOutOfLimit = false  
				scope.end.pan = scope.end.pan / 360 * scope.xGeneric.xMin + scope.end.pan / 360 * scope.xGeneric.xMax
				scope.end.tilt = scope.end.tilt / 180 * scope.yGeneric.yMin + scope.end.tilt / 180 * scope.yGeneric.yMax
				if scope.end.tilt > 0
					scope.end.tilt = 0
				
				i = scope.start.pan
				correction360 = 0
				if i > scope.end.pan
					correction360 = 1
				cols = 1
				while i + xDelta < scope.end.pan + correction360 
					cols++
					i += xDelta
				
				i = scope.start.tilt
				if scope.start.tilt > 0
					i *= -1
				rows = 1
				while i + yDelta > scope.end.tilt 
					rows++
					i += yDelta

				document.getElementById("xStart").textContent = scope.start.pan
				document.getElementById("yStart").textContent = scope.start.tilt
				document.getElementById("xEnd").textContent = scope.end.pan
				document.getElementById("yEnd").textContent = scope.end.tilt
				document.getElementById("xDelta").textContent = xDelta
				document.getElementById("yDelta").textContent = yDelta
				document.getElementById("zoomGeneric").textContent = document.getElementById("zoom").value / 100 * document.getElementById("minZoom").value + document.getElementById("zoom").value / 100 * document.getElementById("maxZoom").value
				document.getElementById("numOfPicutres").textContent = "#{rows} x #{cols} = #{rows*cols}"
				
				picsPerMin = document.getElementById("picsPerMin").value
				minutes = (rows * cols / picsPerMin)
				hours = Math.floor(minutes / 60) 
				minutes -= hours * 60
				seconds = (minutes - Math.floor(minutes))* 60
				document.getElementById("time").textContent = "#{hours} Hours #{Math.floor(minutes)} Minutes #{Math.floor(seconds)} Seconds"
				if(ngThreenorama.ngtAnchors.tiltOutOfLimit)
					document.getElementById("numOfPicutres").textContent += ", Warning: Start Tilt is out of Range!"
				ngThreenorama.outOfRangeColorChange()
				
			canvas = angular.element('<canvas>')[0]
			ngThreenorama.init()
			element.append(ngThreenorama.renderer.domElement)
			resize()
			
			element[0].onmousedown = mouseDown
			element[0].onmouseup = mouseUp
			element[0].onmousemove = mouseMove
			element[0].onmousedrag = mouseDrag

			ngThreenorama.onChangeRect = ->
				updateAngles()
		    				               
			scope.$watch('zoom',zoomChanged)
			scope.$watch('src', sourceChanged)
			scope.$watch('xGeneric', cameraValuesChanged, true)
			scope.$watch('yGeneric', cameraValuesChanged, true)
			scope.$watch('sensor', cameraValuesChanged)
			scope.$watch('zoomAbsolute', cameraValuesChanged)
			scope.$watch('zoomGeneric', cameraValuesChanged)
			scope.$watch('pictureOverlap', cameraValuesChanged)
			scope.$watch('panoramaZoom', cameraValuesChanged)
			$window.onresize = resize
			
			transcludeFn(scope, (clonedTranscludeTemplate) -> element.append(clonedTranscludeTemplate))