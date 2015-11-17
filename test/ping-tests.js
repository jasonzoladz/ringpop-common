// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var events = require('./events');
var test2 = require('./test-util').test2;
var dsl = require('./ringpop-assert');
var prepareCluster = require('./test-util').prepareCluster;
var prepareWithStatus = require('./test-util').prepareWithStatus;
var getClusterSizes = require('./it-tests').getClusterSizes;
var _ = require('lodash');

test2('fair round robin pings', _.filter(getClusterSizes(), function(n) { return n > 5; }) , 20000, 
    prepareCluster(function(t, tc, n) { return [
        dsl.assertRoundRobinPings(t, tc, 30, 6000),
    ];})
);

test2('ping ringpop from fake-nodes', getClusterSizes(), 20000, 
    prepareCluster(function(t, tc, n) { 
    	pingList = _.filter([0,1,1,1,5,6,7], function(i) { return i < n; });
	    return [
	        dsl.sendPings(t, tc, pingList),
	        dsl.waitForPingResponses(t, tc, pingList),
	    ];
	})
);

// piggyback {alive, suspect, faulty} status of fake-node
// who is {alive, suspect, faulty} with {lower, equal, higher}
// incarnation number than the fake-node (27 combinations)
function changeStatus(ns, initial, newState, finalState, incNoDelta, deltaAlive, nSuspect, nFaulty) {
    var ix = 1;
    test2('change status from ' + initial + ', to ' + newState + 
        ' with incNoDelta ' + incNoDelta + ' via piggybacking', 
        ns, 20000, prepareWithStatus(ix, initial, function(t, tc, n) {
            expectedMembers = {};
            expectedMembers[ix] = {status: finalState};
            return [
                dsl.sendPing(t, tc, 0, 
                    {sourceIx: 0, subjectIx: ix, status: newState, subjectIncNoDelta: incNoDelta}),
                dsl.waitForPingResponse(t, tc, 0),
                dsl.assertStats(t, tc, n + deltaAlive, nSuspect, nFaulty, expectedMembers),
            ];
        })
    );
}

changeStatus(getClusterSizes(), 'alive',  'alive', 'alive', -1, 1, 0, 0);
changeStatus(getClusterSizes(), 'alive',  'alive', 'alive',  0, 1, 0, 0);
changeStatus(getClusterSizes(), 'alive',  'alive', 'alive',  1, 1, 0, 0);

changeStatus(getClusterSizes(), 'alive',  'suspect', 'alive',  -1, 1, 0, 0);
changeStatus(getClusterSizes(), 'alive',  'suspect', 'suspect', 0, 0, 1, 0);
changeStatus(getClusterSizes(), 'alive',  'suspect', 'suspect', 1, 0, 1, 0);

changeStatus(getClusterSizes(), 'alive',  'faulty', 'alive', -1, 1, 0, 0);
changeStatus(getClusterSizes(), 'alive',  'faulty', 'faulty', 0, 0, 0, 1);
changeStatus(getClusterSizes(), 'alive',  'faulty', 'faulty', 1, 0, 0, 1);

changeStatus(getClusterSizes(), 'suspect', 'alive', 'suspect', -1, 0, 1, 0);
changeStatus(getClusterSizes(), 'suspect', 'alive', 'suspect',  0, 0, 1, 0);
changeStatus(getClusterSizes(), 'suspect', 'alive', 'alive',   1, 1, 0, 0);

changeStatus(getClusterSizes(), 'suspect', 'suspect', 'suspect', -1, 0, 1, 0);
changeStatus(getClusterSizes(), 'suspect', 'suspect', 'suspect', 0,  0, 1, 0);
changeStatus(getClusterSizes(), 'suspect', 'suspect', 'suspect', 1,  0, 1, 0);

changeStatus(getClusterSizes(), 'suspect', 'faulty', 'suspect', -1, 0, 1, 0);
changeStatus(getClusterSizes(), 'suspect', 'faulty', 'faulty',  0,  0, 0, 1);
changeStatus(getClusterSizes(), 'suspect', 'faulty', 'faulty',  1,  0, 0, 1);

changeStatus(getClusterSizes(), 'faulty',  'alive', 'faulty', -1, 0, 0, 1);
changeStatus(getClusterSizes(), 'faulty',  'alive', 'faulty', 0,  0, 0, 1);
changeStatus(getClusterSizes(), 'faulty',  'alive', 'alive',  1,  1, 0, 0);

changeStatus(getClusterSizes(), 'faulty',  'suspect', 'faulty', -1, 0, 0, 1);
changeStatus(getClusterSizes(), 'faulty',  'suspect', 'faulty',  0, 0, 0, 1);
changeStatus(getClusterSizes(), 'faulty',  'suspect', 'suspect', 1, 0, 1, 0);

changeStatus(getClusterSizes(), 'faulty',  'faulty', 'faulty', -1, 0, 0, 1);
changeStatus(getClusterSizes(), 'faulty',  'faulty', 'faulty',  0, 0, 0, 1);
changeStatus(getClusterSizes(), 'faulty',  'faulty', 'faulty',  1, 0, 0, 1);
