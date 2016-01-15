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
		
		$http({
			method: 'POST',
			url: '/recorderjob',
			data: {name: 'Test', active: true, camera: cam, panorama: {startX: xStart, startY: yStart
			,endX: xEnd, endY: yEnd, deltaX: xDelta, deltaY: yDelta, zoom: zoom}}
		}).then(successCallback,errorCallback)