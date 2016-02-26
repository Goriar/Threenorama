threenoramaApp = angular.module('ThreenoramaApp',['ngThreenorama'])

threenoramaApp.controller 'ThreenoramaCntrl' , ($scope, $http) -> 
	$scope.pictureUploaded = ->
		input = document.getElementById("picUpload")
		reader = new FileReader()
		reader.onload = ((theFile) ->
			(e) -> $scope.$apply ->
				$scope.url = e.target.result
		)(input.files[0])
		reader.readAsDataURL(input.files[0])
	$scope.setSource1 = ->
		$scope.url = 'img/pano.jpg'
	$scope.setSource2 = ->
		input = document.getElementById("picUpload")
		input.click()
	$scope.pictureOverlap = (value) ->
		$scope.overlap = value
	$scope.createRecorderjob = (cam) ->
		successCallback = (response) -> 
			# this callback will be called asynchronously
			# when the response is available
			alert("Success!")
		errorCallback = (response) ->
			# called asynchronously if an error occurs
			# or server returns response with an error status.
			alert("Failure!")
			
		xStart = document.getElementById("xStart").textContent
		yStart = document.getElementById("yStart").textContent
		xEnd = document.getElementById("xEnd").textContent
		yEnd = document.getElementById("yEnd").textContent
		xDelta = document.getElementById("xDelta").textContent
		yDelta = document.getElementById("yDelta").textContent
		zoom = document.getElementById("zoomGeneric").textContent
		
		if yEnd < yStart
			tmp = yStart
			yStart = yEnd
			yEnd = tmp
		if yDelta < 0
			yDelta *= -1
			
		$http({
			method: 'POST',
			url: '/recorderjob',
			data: {name: 'Threenorama', active: true, camera: {id: cam}, startX: xStart, startY: yStart
			,endX: xEnd, endY: yEnd, startTime: '00:00', endTime: '01:00'}
		}).then(successCallback,errorCallback)
		
	$scope.create360Pano = (cam) ->
		
		successCallback = (response) -> 
			# this callback will be called asynchronously
			# when the response is available
			alert("Success!")
		errorCallback = (response) ->
			# called asynchronously if an error occurs
			# or server returns response with an error status.
			alert("Failure!")
			
		xStart = document.getElementById("xMin").value
		yStart = document.getElementById("yMin").value
		xEnd = document.getElementById("xMax").value
		yEnd = document.getElementById("yMax").value
		
		minFocal = document.getElementById("minFocal").value
		maxFocal = document.getElementById("maxFocal").value
		focalDistance = 1 * minFocal + ((maxFocal - minFocal) * (document.getElementById("zoom").value / 100))
		panAngle = Math.atan(document.getElementById("sensorWidth").value / (2 * focalDistance)) * (180 / Math.PI)
		tiltAngle = Math.atan(document.getElementById("sensorHeight").value / (2 * focalDistance)) * (180 / Math.PI)
				
		xDelta = (panAngle * 0.5 / 360 * xStart + panAngle * 0.5 / 360 * xEnd)
		yDelta = (tiltAngle * 0.5 / 180 * yStart + tiltAngle * 0.5 / 180 * yEnd)
		zoom = document.getElementById("minZoom").value
		
		if yEnd < yStart
			tmp = yStart
			yStart = yEnd
			yEnd = tmp
			
		if yDelta < 0
			yDelta *= -1
			
		$http({
			method: 'POST',
			url: '/recorderjob',
			data: {name: 'Threenorama', active: true, camera: {id: cam}, startX: xStart, startY: yStart
			,endX: xEnd, endY: yEnd, startTime: '00:00', endTime: '01:00'}
		}).then(successCallback,errorCallback)