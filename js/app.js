(function() {
  var threenoramaApp;

  threenoramaApp = angular.module('ThreenoramaApp', ['ngThreenorama']);

  threenoramaApp.controller('ThreenoramaCntrl', function($scope) {
    $scope.pictureUploaded = function() {
      var input, reader;
      input = document.getElementById("picUpload");
      reader = new FileReader();
      reader.onload = (function(theFile) {
        return function(e) {
          return $scope.$apply(function() {
            return $scope.url = e.target.result;
          });
        };
      })(input.files[0]);
      return reader.readAsDataURL(input.files[0]);
    };
    $scope.setSource1 = function() {
      return $scope.url = 'img/pano.jpg';
    };
    return $scope.setSource2 = function() {
      var input;
      input = document.getElementById("picUpload");
      return input.click();
    };
  });

}).call(this);
