// Copyright (C) 2015 Constantin Schomburg <me@cschomburg.com>
//
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file.

// A commandline client acting as swiss army knife.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/sarifsystems/sarif/core"
	"github.com/sarifsystems/sarif/sarif"
)

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, Usage)
		flag.PrintDefaults()
	}
	flag.Parse()

	app := New()
	app.Run()
}

type Config struct {
	HistoryFile string
}

type App struct {
	*core.App
	Commands []Command

	Config Config
}

type Command struct {
	Name string
	Do   func()
	Help string
}

func New() *App {
	log.SetFlags(0)
	app := &App{
		App: core.NewApp("sarif", "tars"),
	}
	app.Init()

	app.Config.HistoryFile = app.App.Config.Dir() + "/tars_history"
	app.App.Config.Get("tars", &app.Config)

	app.Commands = []Command{
		{"help", app.Help, ""},
		{"log", app.CmdLog, ""},
		{"interactive", app.Interactive, ""},
		{"cat", app.Cat, usageCat},
		{"down", app.Down, ""},
		{"up", app.Up, ""},
		{"edit", app.Edit, ""},
	}

	return app
}

func (app *App) NewClient() sarif.Client {
	c, err := app.ClientDial(sarif.ClientInfo{
		Name: "tars/" + sarif.GenerateId(),
	})
	app.Must(err)
	return c
}

func (app *App) Run() {
	defer app.Close()
	cmd := "interactive"
	if flag.NArg() > 0 {
		cmd = flag.Arg(0)
	}

	for _, c := range app.Commands {
		if c.Name == cmd {
			c.Do()
			return
		}
	}

	// Default
	app.SingleRequest()
}
