//all controllers are defined here 
//AppCtrl for Logout Process, uses StorageFactories to create User Sessions
angular.module('packagerouter.controllers', [])

.controller('AppCtrl', function($scope, UserIdStorageService, UserStorageService, $state, $ionicNavBarDelegate, $http) {
  $ionicNavBarDelegate.showBackButton(false);
  $scope.$on('$ionicView.enter', function() {
    if (UserStorageService.getAll().length > 0) {
      $scope.loggedIn = UserStorageService.getAll()[0];
      $scope.isLoggedIn = true;
    } else {
      $scope.isLoggedIn = false;
    }
  });
  $scope.doLogout = function() {
    $http.get('http://api.postoncloud.com/api/ShipMart/DeleteVendorExecutive?UserID=' + UserIdStorageService.getAll()[0])
      .success(function(result) {
        console.log(result);
        UserStorageService.removeAll();
        UserIdStorageService.removeAll();
        $state.go('app.login');
      })
      .finally(function() {
        $ionicLoading.hide();
        $scope.$broadcast('scroll.refreshComplete');
      });

  };
})

//Login 
.controller('LoginCtrl', function($scope, UserIdStorageService, UserStorageService, $state, $ionicNavBarDelegate, $ionicLoading, $http) {
  $ionicNavBarDelegate.showBackButton(false);
  $scope.animateClass = 'button-positive';

  $scope.doLogin = function(email, password) {
    if (!email) {
      return;
    }
    if (!password) {
      return;
    }
    $ionicLoading.show({
      template: '<ion-spinner icon="bubbles"></ion-spinner><br/>Signing In!'
    });
    $http.get('http://api.postoncloud.com/api/ShipMart/ValidateAndSignIn?EmailId=' + email + '&PhoneNumber=&Password=' + password + '&Status=5')
      .success(function(result) {
        if (result[0].UserId != 'User does not exists') {
          console.log(result);
          $state.go('app.location');
          UserStorageService.add(email);
          UserIdStorageService.add(result[0].UserId);
        } else {
          $scope.animateClass = 'button-assertive';
        }
      })
      .finally(function() {
        $ionicLoading.hide();
        $scope.$broadcast('scroll.refreshComplete');
      });
  }

})

.controller('LogoutCtrl', function($scope, UserStorageService, $state, $ionicNavBarDelegate) {


})

.controller('LocationCtrl', function($scope, UserIdStorageService, UserStorageService, $state, $ionicNavBarDelegate,
  $cordovaGeolocation, $ionicLoading, $http, LocationStorageService,
  PrimarySocketFactory, OrderStorageService, $cordovaLocalNotification, Items) {

    //$state.go('app.order', {item:item});

  $cordovaLocalNotification.add({
    id: 1,
    date: new Date(),
    message: "Everything Working Fine",
    title: "Ship24x",
    autoCancel: true,
    sound: null
  }).then(function() {
    console.log("The notification has been set");
  });
  $scope.items = [];
  $scope.refreshLocation = function() {
    LocationStorageService.removeAll();
    getLocationAndAddress();
  }
  var getLocationAndAddress = function() {
    ionic.Platform.ready(function() {
      $ionicLoading.show({
        template: '<ion-spinner icon="bubbles"></ion-spinner><br/>Acquiring location!'
      });

      var posOptions = {
        enableHighAccuracy: true,
        timeout: 2000000,
        maximumAge: 0
      };
      if (LocationStorageService.getAll().length < 1) {
        $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
          $scope.lat = position.coords.latitude;
          $scope.lng = position.coords.longitude;
          $http.get('http://api.opencageItems.com/geocode/v1/json?q=' + $scope.lat + '+' + $scope.lng + '&key=' + $scope.GeoCodingAPIKey)
            .success(function(result) {
              $scope.address = result.results[0].formatted;
              location.lat = $scope.lat;
              location.lng = $scope.lng;
              location.add = result.results[0].formatted;
              LocationStorageService.add(location);
              $http.get('http://api.postoncloud.com/api/ShipMart/AddCurrentUSerLocation?UserId=' + UserIdStorageService.getAll()[0] + '&Latitude=' + $scope.lat + '&Longlatitude=' + $scope.lng + '&Status=5&Type=1&CreatedBy=1')
                .success(function(result) {
                  $scope.result = 'Location Sent to Server';
                });
              console.log(result);
            })
            .finally(function() {
              $ionicLoading.hide();
              $scope.$broadcast('scroll.refreshComplete');
            });

        }, function(err) {
          $ionicLoading.hide();
          $scope.$broadcast('scroll.refreshComplete');
          console.log(err);
        });
      } else {
        $scope.lat = LocationStorageService.getAll()[0].lat;
        $scope.lng = LocationStorageService.getAll()[0].lng;
        $scope.address = LocationStorageService.getAll()[0].add;
        $ionicLoading.hide();
        $scope.$broadcast('scroll.refreshComplete');
      }
    });
  };
  $scope.GeoCodingAPIKey = '93d639c2f2e101a955c9dd2ec8704fca';
  var location = {
    lat: null,
    lng: null,
    add: null
  };
  $ionicNavBarDelegate.showBackButton(false);
  $scope.$on('$ionicView.enter', function() {
    if (UserStorageService.getAll().length < 1) {
      $state.go('app.login');
    } else {
      getLocationAndAddress();
    }
  });

  Items.$watch(function(event) {
    if (event.event === 'child_added'&& !(OrderStorageService.getAll().length>0)) {
      console.log(Items[0]);
      if (Items[0].pickers[0].userid === UserIdStorageService.getAll()[0]) {
        $cordovaLocalNotification.add({
          id: Items[0].orignalBody.shipmentId,
          date: new Date(),
          message: Items[0].orignalBody.pickupAddress,
          title: Items[0].orignalBody.itemName,
          autoCancel: true,
          sound: null
        }).then(function() {
          console.log("The notification has been set");
        });
        $scope.items[0] = Items[0].orignalBody;
      } else {
        $scope.messageNoPickups = "No Pickups NearBy";
      }
      for (var i = 1; i < Items[0].pickers.length; i++) {
        setTimeout(function(i) {
          if (Items[0].pickers[i].userid === UserIdStorageService.getAll()[0]) {
            $scope.items[0] = Items[0].orignalBody;
            $state.go($state.current, {}, {
              reload: true
            });
          } else {
            $scope.messageNoPickups = "No Pickups NearBy";
          }
        }, 30000, i);
      }
    }
  });

  $scope.accept = function(result) {
    $http.get('https://bufferbasedrouting.herokuapp.com/dangling/delete')
      .success(function(microResult) {
        $scope.items = [];
        OrderStorageService.removeAll();
        OrderStorageService.add(result);
        $state.go('app.tracker');
      });
  }
})

.controller('TrackerCtrl', function($scope, UserStorageService, UserIdStorageService,$state, $ionicNavBarDelegate, OrderStorageService, $http) {
  $scope.ct = 1;
  var colorArr = ['button-assertive', 'button-positive', 'button-balanced', 'button-calm', 'button-energized'];
  var percentArr = [0, 50, 100];
  var statusTextArr = ['Assigned', 'Reach Vendor Premises', 'Picked from Vendor', 'Reached Customer Premises', 'Delievered', null];
  if (OrderStorageService.getAll().length == 0) {
    $scope.rangeColorPainters = 'range-royal';
    $scope.nothingToSeeHere = true;
  } else {
    $scope.item = OrderStorageService.getAll()[0];
    $scope.value = percentArr[0];
    $scope.statusColor = colorArr[0];
    $scope.buttonText =statusTextArr[1];
    $scope.statusText = statusTextArr[0];
  }

  $scope.updateStatus = function() {

    $http.get('http://api.postoncloud.com/api/ShipMart/AddShipmentTracking?ShipmentID=' + $scope.item.shipmentId + '&AssignTo=' + UserIdStorageService.getAll()[0] + '&Status=' + ($scope.ct + 1))
      .success(function(result) {
        console.log(result);
        $scope.ct++;
        $scope.value = percentArr[$scope.ct];
        $scope.statusColor = colorArr[$scope.ct];
        $scope.buttonText = statusTextArr[$scope.ct + 1];
        $scope.statusText = statusTextArr[$scope.ct];
        if ($scope.buttonText == null) {
          $scope.isDelivered = true;
        }
        $state.go($state.current, {}, {
          reload: true
        });
      });

  }

});