angular
  .module('tivityApp', [
    'chart.js', 'ui.router', 'satellizer'])
  .controller('MainController', MainController)
  .controller('HomeController', HomeController)
  .controller('LoginController', LoginController)
  .controller('SignupController', SignupController)
  .controller('LogoutController', LogoutController)
  .controller('ProfileController', ProfileController)
  .controller('GoalsController', GoalsController)
  .service('Account', Account)
  .config(configRoutes)
  ;

////////////
// ROUTES //
////////////

configRoutes.$inject = ["$stateProvider", "$urlRouterProvider", "$locationProvider"]; // minification protection
function configRoutes($stateProvider, $urlRouterProvider, $locationProvider) {

  // this allows us to use routes without hash params!
  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false
  });

  // for any unmatched URL redirect to /
  $urlRouterProvider.otherwise("/");

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'templates/home.html',
      controller: 'HomeController',
      controllerAs: 'home'
    })
    .state('goals', {
      url: '/goals/:id',
      templateUrl: 'templates/goals.html',
      controller: 'GoalsController',
      controllerAs: 'goals',

    })
    .state('signup', {
      url: '/signup',
      templateUrl: 'templates/signup.html',
      controller: 'SignupController',
      controllerAs: 'sc',
      resolve: {
        skipIfLoggedIn: skipIfLoggedIn
      }
    })
    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginController',
      controllerAs: 'lc',
      resolve: {
        skipIfLoggedIn: skipIfLoggedIn
      }
    })
    .state('logout', {
      url: '/logout',
      template: null,
      controller: 'LogoutController',
      resolve: {
        loginRequired: loginRequired
      }
    })
    .state('profile', {
      url: '/profile',
      templateUrl: 'templates/profile.html',
      controller: 'ProfileController',
      controllerAs: 'profile',
      resolve: {
        loginRequired: loginRequired
      }
    });


    function skipIfLoggedIn($q, $auth) {
      var deferred = $q.defer();
      if ($auth.isAuthenticated()) {
        deferred.reject();
      } else {
        deferred.resolve();
      }
      return deferred.promise;
    }

    function loginRequired($q, $location, $auth) {
      var deferred = $q.defer();
      if ($auth.isAuthenticated()) {
        deferred.resolve();
      } else {
        $location.path('/login');
      }
      return deferred.promise;
    }

}

/////////////////
// CONTROLLERS //
/////////////////

MainController.$inject = ["Account"]; // minification protection
function MainController (Account) {
  var vm = this;

  vm.currentUser = function() {
   return Account.currentUser();
  };

}

GoalsController.$inject = ["$http", "$location", "$scope", "$state", "$stateParams", "$window"];
function GoalsController ($http, $location, $scope, $state, $stateParams, $window) {
  var vm = this;
  var goalId = ($location.path().split("/")[2]);

  $http.get('/api/goals/' + goalId)
    .then(function (response) {
      
      vm.new_task = {};

      $scope.goal = response.data;
      vm.tasks = $scope.goal.tasks;

      // grabbing the number of completed tasks
      var complete = 0;
      var completedTasks = function () {
        for (var i = 0; i < $scope.goal.tasks.length ; i++) {
            if ($scope.goal.tasks[i].complete === true) {
              complete ++;
          }
        }
        return complete;
      };

      completedTasks();

      // calculating perecentage
      var findPercentage = function () {
        var totalTasks = $scope.goal.tasks.length;
        var percentageComplete =  Math.round((complete  / totalTasks) * 100) ;
        return percentageComplete;
      };
      vm.percent = findPercentage();
      vm.remaining = (100 - vm.percent);

      $scope.labels = ["Progress", "Remaining"];
      $scope.data = [vm.percent, vm.remaining];

      // calculating time remaining  
      var fixedDate = $scope.goal.goalDate.split("T"),
          newDate = fixedDate[0],
          changedDate = new Date(newDate), 
          currentDate = new Date();

      vm.difference = -(Math.round(((currentDate - changedDate) / (1000*60*60*24))));

      // Task CRUD Functions
      vm.addTask = function() {
        $http.post('/api/goals/' + goalId + '/tasks', vm.new_task)
          .then(function (response) {
            vm.tasks.push(response.data.tasks[(response.data.tasks.length) - 1]);
            vm.new_task = {};
            $state.reload();
          });
      };

      vm.updateTask = function(task) {
        var updatedTask = task;
        var taskId = task._id;
        $http.put('/api/goals/' + goalId + '/tasks/' + taskId, updatedTask)
          .then(function (response) {
            console.log("Successfully updated task!");
          });
      }; 

      vm.deleteTask = function(task) {
        var taskId = task._id;
        $http.delete('/api/goals/' + goalId + '/tasks/' + taskId)
          .then(function (response) {
            var taskIndex = vm.tasks.indexOf(task);
            vm.tasks.splice(taskIndex, 1);
            $state.reload();
          });
      };

      // Function for marking tasks complete
      vm.markComplete = function(task) {
        var updatedTask = task;
        var taskId = task._id;
        $http.put('/api/goals/' + goalId + '/tasks/' + taskId, updatedTask)
          .then(function (response) {
            $state.reload();
          });
      };
    });
}

HomeController.$inject = ["$http", "Account", "$scope", "$state", "$location"]; // minification protection
function HomeController ($http, Account, $scope, $state, $location) {

  var vm = this;
  vm.goals = [];
  vm.new_goal = {}; // form data

  $http.get('/api/me/goals')
    .then(function (response) {
      vm.goals = response.data;
      $scope.labels = [];

      vm.returnlabels = function() {
        for (var i = 0; i < vm.goals.length; i ++) {
          goalTitle = vm.goals[i].title;
          $scope.labels.push(goalTitle);
        }
        window.labels = $scope.labels;
        window.data = $scope.data;
        return $scope.labels;
      };

      vm.returnlabels();

      // grab number of completed tasks
      vm.completeArray = [];
      vm.completedTasks = function () {
        var complete = 0;
        for (var i = 0; i < vm.goals.length ; i++) {
          for (var j = 0; j < vm.goals[i].tasks.length ; j ++ ) {
            if (vm.goals[i].tasks[j].complete === true) {
              complete ++;
            }
          }
          vm.completeArray.push(complete);
          complete = 0;
        }
        console.log('number completed for each', vm.completeArray);
        return vm.completeArray;
      };

      vm.completedTasks();
      //grab # of tasks per goal
      vm.tasksArray = [];
      vm.countTasks = function () {
        for (var i = 0; i < vm.goals.length; i ++) {
          tasksLength = vm.goals[i].tasks.length;
          vm.tasksArray.push(tasksLength);
        }
        return vm.tasksArray;
      };
      vm.countTasks();
      console.log('taskArray', vm.tasksArray);

      // divide the two arrays to get percentage
      vm.quotientArray = [];
      vm.quotient = function () {
        for (var i = 0; i < vm.completeArray.length; i ++) {
          vm.quotientArray.push( Math.round((vm.completeArray[i] / vm.tasksArray[i]) * 100) );
        }
        return vm.quotientArray;
      };

      vm.quotient();
      $scope.data = [ vm.quotientArray ];
    });

  vm.createGoal = function() {
    $http.post('/api/goals', vm.new_goal)
      .then(function (response){
        vm.goals.push(response.data);
        console.log(response.data);
        vm.new_goal = {};
        $scope.labels.push(response.data.title);
      });
  };

  vm.updateGoal = function(goal) {
    console.log('updateGoal frontend', goal);
    var updatedGoal = goal;
    $http.put('/api/goals/' + goal._id, updatedGoal)
      .then(function(response) {
        console.log("hitting this update frontend");
        $state.reload();
      });
  };

  vm.deleteGoal = function(goal) {
    console.log('goal from delete', goal);
    $http.delete('/api/goals/' + goal._id)
      .then(function (response) {
        var index = vm.goals.indexOf(goal);
        vm.goals.splice(index, 1);
        $scope.labels.splice(index, 1);
      });
  };
}

LoginController.$inject = ["$location", "Account"]; // minification protection
function LoginController ($location, Account) {
  var vm = this;
  vm.new_user = {}; // form data

  vm.login = function() {
    Account
      .login(vm.new_user)
      .then(function(){
        vm.new_user = {};      
        $location.path( '/home' );
      });
  };
}

SignupController.$inject = ["$location", "Account"]; // minification protection
function SignupController ($location, Account) {
  var widget = uploadcare.initialize('#profileimg');
  var vm = this;
  vm.new_user = {}; // form data

  vm.signup = function() {
    vm.new_user.picture = $('#profileimg').val();
    Account
      .signup(vm.new_user)
      .then(function (response) {
          vm.new_user = {};
          $location.path( '/home' );
        }
      );
  };
}

LogoutController.$inject = ["$location", "Account"]; // minification protection
function LogoutController ($location, Account) {
  Account.logout();
  $location.path('/login');
}


ProfileController.$inject = ["$http", "Account"]; // minification protection
function ProfileController ($http, Account) {
  var widget = uploadcare.initialize('#profileimg');

  var vm = this;
  vm.new_profile = {}; // form data

  vm.updateProfile = function() {
    vm.new_profile.picture = $('#profileimg').val();
    console.log('new profile', vm.new_profile);
    Account
      .updateProfile(vm.new_profile)
      .then(function () {
          vm.showEditForm = false;
        }
      );
  };
}

//////////////
// Services //
//////////////

Account.$inject = ["$http", "$q", "$auth"]; // minification protection
function Account($http, $q, $auth) {
  var self = this;
  self.user = null;

  self.signup = signup;
  self.login = login;
  self.logout = logout;
  self.currentUser = currentUser;
  self.getProfile = getProfile;
  self.updateProfile = updateProfile;

  function signup(userData) {
    return ($auth.signup(userData)
      .then(function(response) {
        $auth.setToken(response.data.token);
      })
      .catch(function(error) {
        console.error(error);
        }
      )
    );
  }

  function login(userData) {
    return (
      $auth
        .login(userData)
        .then(
          function onSuccess(response) {
            $auth.setToken(response.data.token);
          },

          function onError(error) {
            console.error(error);
          }
        )
    );
  }

  function logout() {
    $auth
      .logout()
      .then(function () {
      self.user = null;
    });
  }

  function currentUser() {
    if ( self.user ) { return self.user; }
    if ( !$auth.isAuthenticated() ) { return null; }

    var deferred = $q.defer();
    getProfile().then(
      function onSuccess(response) {
        self.user = response.data;
        deferred.resolve(self.user);
      },

      function onError() {
        $auth.logout();
        self.user = null;
        deferred.reject();
      }
    );
    self.user = promise = deferred.promise;
    return promise;

  }

  function getProfile() {
    return $http.get('/api/me');
  }

  function updateProfile(profileData) {
    return (
      $http
        .put('/api/me', profileData)
        .then(
          function (response) {
            self.user = response.data;
          }
        )
    );
  }
}

