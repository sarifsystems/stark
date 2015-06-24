var mainApp = angular.module('mainApp', ['ngRoute', 'ngSanitize', 'timeAgo', 'ui.bootstrap']);

function clickableLinks(text) {
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(exp,"<a href='$1'>$1</a>"); 
}

mainApp.factory('stark', function($rootScope, $q) {
	var client = new StarkClient("web-" + GenerateId());
	client.Request = function(msg, onReply) {
		if (onReply) {
			StarkClient.prototype.Request.call(client, msg, function(msg) {
				onReply(msg);
				$rootScope.$digest();
			});
		} else {
			var deferred = $q.defer();
			StarkClient.prototype.Request.call(client, msg, function(msg) {
				deferred.resolve(msg);
				$rootScope.$digest();
			});
			return deferred.promise;
		}
	};
	return client;
});

mainApp.config(function($routeProvider, $locationProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'pages/start.html',
			controller: 'StartCtrl'
		})
		.when('/chat', {
			templateUrl: 'pages/chat.html',
			controller: 'ChatCtrl'
		})
		.when('/daily/:date?', {
			templateUrl: 'pages/daily.html',
			controller: 'DailyCtrl'
		})
		.when('/stats', {
			templateUrl: 'pages/stats.html',
			controller: 'StatsCtrl'
		});
	$locationProvider.html5Mode(false);
});

mainApp.controller('MainCtrl', function($scope, $location) {
	$scope.isActive = function(route) {
		return route === $location.path();
	}
});

mainApp.controller('ChatCtrl', function ($scope, stark) {
	$scope.responses = [];
	$scope.dropdownOpen = false;

	$scope.publish = function() {
		if (!$scope.message) {
			return;
		}
		if ($scope.message == "clear") {
			$scope.clearHistory();
		} else {
			var msg = {
				action: "natural/handle",
				text: $scope.message,
			};
			stark.Request(msg, $scope.addMessage);
			$scope.addMessage(msg);
		}
		$scope.message = "";
	};

	$scope.clearHistory = function() {
		$scope.responses = [];
	}

	$scope.openDropdown = function() {
		$scope.dropdownOpen = true;
	}

	$scope.addMessage = function(msg) {
		var chat = {
			msg: msg,
			isSelf: (msg.src == stark.deviceId),
			time: new Date(),
			text: msg.text || (msg.action + " from " + msg.src)
		}
		$scope.responses.push(chat);
		$scope.openDropdown();
	};
});

mainApp.controller('StartCtrl', function($scope, stark) {
	stark.Request({
		action: 'event/last',
		p: {
			verb: 'drink',
			object: 'coffee'
		}
	}).then(function(msg) {
		$scope.lastCoffee = msg.p;
	});

	stark.Request({
		action: 'location/last',
	}).then(function(msg) {
		$scope.lastLocation = msg.p;
	});
});

mainApp.controller('DailyCtrl', function($scope, $location, $routeParams, stark) {
	$scope.dateStart= new Date();
	if ($routeParams.date) {
		$scope.dateStart = new Date($routeParams.date);
	}
	$scope.dateStart.setHours(4, 0, 0, 0);
	$scope.dateEnd = new Date($scope.dateStart.getTime());
	$scope.dateEnd.setHours(28);

	$scope.changeDay = function(addDays) {
		var date = new Date($scope.dateStart.getTime());
		date.setDate(date.getDate() + addDays);
		date = date.toISOString();
		date = date.substring(0, date.indexOf('T'));
		$location.path('/daily/' + date);
	};

	stark.Request({
		action: 'location/list',
		p: {
			after: $scope.dateStart.toISOString(),
			before: $scope.dateEnd.toISOString()
		}
	}).then(function(msg) {
		$scope.locations = msg.p.locations;
		$scope.firstLocation = msg.p.locations[0];
		$scope.lastLocation = msg.p.locations[msg.p.locations.length - 1];

		var latlngs = [];
		var last = undefined;
		var dist = 0;
		var clusterCount = 0;
		var clusters = [];
		angular.forEach(msg.p.locations, function(loc) {
			latlngs.push([loc.latitude, loc.longitude]);
			var p = L.latLng(loc.latitude, loc.longitude);
			if (last) {
				var d = p.distanceTo(last);
				dist += d;
				if (d < 500) {
					clusterCount++;
					if (clusterCount == 2) {
						clusters.push([loc.latitude, loc.longitude]);
					}
				} else {
					clusterCount = 0;
				}
			}
			last = p;
		});
		$scope.distance = dist;

		var map = L.map('map', {
			zoomControl: false,
			attributionControl: false
		});
		var mapUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
		var mapSubdomains = ['otile1', 'otile2', 'otile3', 'otile4'];
		var maplayer = new L.TileLayer(mapUrl, {attribution: '', subdomains: mapSubdomains});
		maplayer.addTo(map);
		L.polyline(latlngs).addTo(map);
		angular.forEach(clusters, function(cluster) {
			L.marker(cluster).addTo(map);
		});
		map.fitBounds(latlngs);
	});

	stark.Request({
		action: 'event/list',
		p: {
			after: $scope.dateStart.toISOString(),
			before: $scope.dateEnd.toISOString()
		}
	}).then(function(msg) {
		$scope.lastEvents = msg.p.events;
	});

	$scope.dailyDate = new Date();
	$scope.dailyDatepickerOpened = false;
	$scope.openDailyDatepicker = function($event) {
		$scope.dailyDatepickerOpened = true;
	};

	$scope.goDailyDate = function() {
		var date = $scope.dailyDate.toISOString();
		date = date.substring(0, date.indexOf('T'));
		$location.path('/daily/' + date);
	};
});

mainApp.controller('StatsCtrl', function($scope, $location, $routeParams, stark) {
	$scope.dateStart= new Date();
	if ($routeParams.date) {
		$scope.dateStart = new Date($routeParams.date);
	}
	$scope.dateStart.setHours(4, 0, 0, 0);
	$scope.dateEnd = new Date($scope.dateStart.getTime());
	$scope.dateEnd.setHours(28);

	$scope.changeDay = function(addDays) {
		var date = new Date($scope.dateStart.getTime());
		date.setDate(date.getDate() + addDays);
		date = date.toISOString();
		date = date.substring(0, date.indexOf('T'));
		$location.path('/daily/' + date);
	};

	stark.Request({
		action: 'event/list',
		p: {
			action: "devices/changed/indi.lan",
		}
	}).then(function(msg) {
		var data = [{
			key: 'Events',
			values: [],
		}];
		var byAction = {}
		angular.forEach(msg.p.events, function(event) {
			var x = (new Date(event.time)).getTime();
			if (x < 0) {
				return;
			}
			if (!byAction[event.action]) {
				byAction[event.action] = {
					key: event.action,
					values: [],
				};
			}
			byAction[event.action].values.push({
				x: x,
				y: event.value,
			});
		})
		var data = []
		for (action in byAction) {
			data.push(byAction[action]);
		}
		console.log(msg, byAction, data);

		var tickMultiFormat = d3.time.format.multi([
			["%b %-d, %0H:%M", function(d) { return d.getMinutes(); }], // not the beginning of the hour
			["%b %-d, %-H:%M",    function(d) { return d.getHours(); }], // not midnight
			["%b %-d",   function(d) { return d.getDate() != 1; }], // not the first of the month
			["%b %-d",   function(d) { return d.getMonth(); }], // not Jan 1st
			["%Y",       function() { return true; }]
		]);

		nv.addGraph(function() {
			var chart = nv.models.scatterChart()
			.showDistX(true)
			.showDistY(true)
			.color(d3.scale.category10().range());

			chart.tooltipContent(function(key, x, y, graph) {
				return '<h3>' + key + '</h3>';
			});

			chart.xAxis
				.showMaxMin(false)
				//.rotateLabels(45)
				.tickPadding(10)
				.tickFormat(function(d) { return tickMultiFormat(new Date(d)); });
			chart.xScale(d3.time.scale());
			chart.yAxis.tickFormat(d3.format('.02f'));

			d3.select('#chart svg')
			.datum(data)
			.call(chart);

			nv.utils.windowResize(chart.update);

			return chart;
		});
	});
});
