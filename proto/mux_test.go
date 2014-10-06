// Copyright (C) 2014 Constantin Schomburg <me@cschomburg.com>
//
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file.

package proto

import (
	"testing"
	"time"
)

type multiEp struct {
	action    string
	device    string
	oneShould bool
	twoShould bool
}

func TestMuxMultiple(t *testing.T) {
	tests := []multiEp{
		{"ping", "one", true, false},
		{"ping", "two", false, true},
		{"ping", "", false, true},
		{"ack", "one", false, false},
		{"ack", "two", false, false},
		{"ack", "", false, false},
	}

	mux := NewMux()
	mux.RegisterPublisher(func(msg Message) error {
		return nil
	})
	oneFired, twoFired := false, false

	epOne := mux.NewConn()
	epOne.RegisterHandler(func(msg Message) {
		oneFired = true
	})
	epOne.Publish(CreateMessage("proto/sub", Subscription{"ping", "one", nil}))

	epTwo := mux.NewConn()
	epTwo.RegisterHandler(func(msg Message) {
		twoFired = true
	})
	epTwo.Publish(CreateMessage("proto/sub", Subscription{"ping", "two", nil}))
	epTwo.Publish(CreateMessage("proto/sub", Subscription{"ping", "", nil}))

	for _, test := range tests {
		oneFired, twoFired = false, false
		mux.Handle(Message{
			Action:      test.action,
			Destination: test.device,
		})
		time.Sleep(time.Millisecond)
		if test.oneShould && !oneFired {
			t.Error("one did not fire", test)
		}
		if !test.oneShould && oneFired {
			t.Error("one should not fire", test)
		}
		if test.twoShould && !twoFired {
			t.Error("two did not fire", test)
		}
		if !test.twoShould && twoFired {
			t.Error("two should not fire", test)
		}
	}
}
