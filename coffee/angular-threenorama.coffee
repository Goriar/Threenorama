module = angular.module('ngThreenorama',[])

module.service('ngThreenorama', -> new NGTScene())

module.directive 'ngThreenorama' , (ngThreenorama, $window) ->
	directive =
		transclude: true 
		scope:
			src: '='
			zoom: '='
			zoomStep: '='
			start: '='
			end: '='
		link:(scope,element,attrs,ctrl,transcludeFn) ->
			scope.zoomStep ?= 1
			scope.zoom ?= 50
			scope.start ?= 
				tilt: 0
				pan: 0
			scope.end ?=
				tilt: 0
				pan: 0

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
				
			canvas = angular.element('<canvas>')[0]
			ngThreenorama.init()
			element.append(ngThreenorama.renderer.domElement)
			resize()
			
			element[0].onmousedown = mouseDown
			element[0].onmouseup = mouseUp
			element[0].onmousemove = mouseMove
			element[0].onmousedrag = mouseDrag

			ngThreenorama.onChangeRect = ->
				scope.$apply ->
					scope.start.tilt = ngThreenorama.ngtAnchors.startTilt
					scope.start.pan = ngThreenorama.ngtAnchors.startPan
					scope.end.tilt = ngThreenorama.ngtAnchors.endTilt
					scope.end.pan = ngThreenorama.ngtAnchors.endPan
			scope.$watch('zoom',zoomChanged)
			scope.$watch('src', sourceChanged)
			$window.onresize = resize
			
			transcludeFn(scope, (clonedTranscludeTemplate) -> element.append(clonedTranscludeTemplate))