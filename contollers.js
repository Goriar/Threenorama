var panoramaApp = angular.module('panoramaApp',[]);

panoramaApp.controller('PanoramaCtrl', function($scope,$http){
	$http.get('/picture')
});