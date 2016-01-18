(function() {
  var threenoramaApp;

  threenoramaApp = angular.module('ThreenoramaApp', ['ngThreenorama']);

  threenoramaApp.controller('ThreenoramaCntrl', function($scope, $http) {
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
    $scope.setSource2 = function() {
      var input;
      input = document.getElementById("picUpload");
      return input.click();
    };
    $scope.pictureOverlap = function(value) {
      return $scope.overlap = value;
    };
    $scope.createRecorderjob = function(cam) {
      var errorCallback, successCallback, tmp, xDelta, xEnd, xStart, yDelta, yEnd, yStart, zoom;
      successCallback = function(response) {
        return alert("Success!");
      };
      errorCallback = function(response) {
        return alert("Failure!");
      };
      xStart = document.getElementById("xStart").textContent;
      yStart = document.getElementById("yStart").textContent;
      xEnd = document.getElementById("xEnd").textContent;
      yEnd = document.getElementById("yEnd").textContent;
      xDelta = document.getElementById("xDelta").textContent;
      yDelta = document.getElementById("yDelta").textContent;
      zoom = document.getElementById("zoomGeneric").textContent;
      if (yEnd < yStart) {
        tmp = yStart;
        yStart = yEnd;
        yEnd = tmp;
      }
      if (yDelta < 0) {
        yDelta *= -1;
      }
      return $http({
        method: 'POST',
        url: '/recorderjob',
        data: {
          name: 'Threenorama',
          active: true,
          camera: {
            id: cam
          },
          panorama: {
            startX: xStart,
            startY: yStart,
            endX: xEnd,
            endY: yEnd,
            deltaX: xDelta,
            deltaY: yDelta,
            zoom: zoom
          }
        }
      }).then(successCallback, errorCallback);
    };
    return $scope.create360Pano = function(cam) {
      var errorCallback, focalDistance, maxFocal, minFocal, panAngle, successCallback, tiltAngle, tmp, xDelta, xEnd, xStart, yDelta, yEnd, yStart, zoom;
      successCallback = function(response) {
        return alert("Success!");
      };
      errorCallback = function(response) {
        return alert("Failure!");
      };
      xStart = document.getElementById("xMin").value;
      yStart = document.getElementById("yMin").value;
      xEnd = document.getElementById("xMax").value;
      yEnd = document.getElementById("yMax").value;
      minFocal = document.getElementById("minFocal").value;
      maxFocal = document.getElementById("maxFocal").value;
      focalDistance = 1 * minFocal + ((maxFocal - minFocal) * (document.getElementById("zoom").value / 100));
      panAngle = Math.atan(document.getElementById("sensorWidth").value / (2 * focalDistance)) * (180 / Math.PI);
      tiltAngle = Math.atan(document.getElementById("sensorHeight").value / (2 * focalDistance)) * (180 / Math.PI);
      xDelta = panAngle * 0.5 / 360 * xStart + panAngle * 0.5 / 360 * xEnd;
      yDelta = tiltAngle * 0.5 / 180 * yStart + tiltAngle * 0.5 / 180 * yEnd;
      zoom = document.getElementById("minZoom").value;
      if (yEnd < yStart) {
        tmp = yStart;
        yStart = yEnd;
        yEnd = tmp;
      }
      if (yDelta < 0) {
        yDelta *= -1;
      }
      return $http({
        method: 'POST',
        url: '/recorderjob',
        data: {
          name: '360Pano',
          active: true,
          camera: {
            id: cam
          },
          panorama: {
            startX: xStart,
            startY: yStart,
            endX: xEnd,
            endY: yEnd,
            deltaX: xDelta,
            deltaY: yDelta,
            zoom: zoom
          }
        }
      }).then(successCallback, errorCallback);
    };
  });

}).call(this);
