(function() {
  var threenoramaApp;

  threenoramaApp = angular.module('ThreenoramaApp', ['ngThreenorama']);

  threenoramaApp.controller('ThreenoramaCntrl', function($scope) {
    $scope.setSource1 = function() {
      return $scope.url = 'img/pano.jpg';
    };
    return $scope.setSource2 = function() {
      return $scope.url = 'pano2.jpg';
    };
  });

}).call(this);
