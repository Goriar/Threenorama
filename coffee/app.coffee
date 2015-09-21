threenoramaApp = angular.module('ThreenoramaApp',['ngThreenorama'])

threenoramaApp.controller 'ThreenoramaCntrl' , ($scope) -> 
	$scope.setSource1 = ->
		$scope.url = 'img/pano.jpg'
	$scope.setSource2 = ->
		$scope.url = 'pano2.jpg'
