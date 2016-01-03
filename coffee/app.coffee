threenoramaApp = angular.module('ThreenoramaApp',['ngThreenorama'])

threenoramaApp.controller 'ThreenoramaCntrl' , ($scope) -> 
	$scope.pictureUploaded = ->
		input = document.getElementById("picUpload")
		reader = new FileReader()
		reader.onload = ((theFile) ->
			(e) ->
				$scope.url = e.target.result
		)(input.files[0])
		reader.readAsDataURL(input.files[0])
	$scope.setSource1 = ->
		$scope.url = 'img/pano.jpg'
	$scope.setSource2 = ->
		input = document.getElementById("picUpload")
		input.click()
		$scope.url = input.value