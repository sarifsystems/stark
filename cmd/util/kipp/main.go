// Copyright (C) 2014 Constantin Schomburg <me@cschomburg.com>
//
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file.

// KIPP is a desktop daemon that serves notifications and provides local access.
package main

import (
	"github.com/xconstruct/stark/core/server"
	"github.com/xconstruct/stark/services/dbus"
	"github.com/xconstruct/stark/services/mpd"
	"github.com/xconstruct/stark/services/web"
)

func main() {
	srv := server.New("stark", "kipp")

	srv.RegisterModule(dbus.Module)
	srv.RegisterModule(mpd.Module)
	srv.RegisterModule(web.Module)

	// Default configuration
	srv.ServerConfig.EnabledModules = []string{
		"dbus",
		"mpd",
	}

	srv.Run()
}
