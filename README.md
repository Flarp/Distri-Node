# Distri-Node

```npm install Flarp/distri-node```

Distributed computing in Node!

## What is distributed computing?

Let's say you and three pals are in Math. At the end, the teacher hands out the homework for the night, and you really _really_ don't want to do it. You and your three pals get together and decide you're going to divide up the nights homework, and share the answers you got with each other, and call it a night. 

This is distributed computing, except there's a bit more computing involved. Why have one computer sit down and process multiple equations one by one, when users can do it for them? The equations will be _distributed_ to other clients, and they will each independently calculate each one, then send back the result. This makes it much faster to do, and will most certainly take much less time to do for large equation sets.

## Isn't that what BOINC is?

That's exactly what BOINC is!

## So why are you doing it again?

BOINC has its shortcomings, such as distributing executables, not source code, and other baloney. It also can't run in a browser, which is a huge shortcoming, because everyone has a browser. How are you viewing this? (Well, maybe you used Git and cloned the repo but I think you get the point.) Distri will allow you to give others source code, like JavaScript, WebAssembly, and C/C++ code to be compiled or interpreted, so what you're getting is not some strange mystery.

Also, this library uses WebSockets, so browsers aren't left out of the party. Everybody is included in the fun.

## But I wanna protect my code from evil hackers!

You could always put the code under a license, like the GPL or something of the sort. 

## But I don't wanna have anyone see my code, period!

That's something you need to work out. Distri is for open-source projects. 

## Alright, fine... what do I need to use it?

To be able to use all features of Distri, you must have the latest version of Node.js. Distri uses [for...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) loops, [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment), ES6 [Maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), [Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes), and [Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

## So, what does each module in it do?

Distri comes with a few modules, so I thought it would be nice to explain what each one does.

[```ws```](https://github.com/websockets/ws) - Creates a WebSocket server and handles the low-level junk. The reason WebSockets are used over HTTP is that the current session of the user can be kept track of, and if at any time the user disconnects, we'll know.

[```msgpack```](https://github.com/pgriess/node-msgpack) - Packs JSON objects into binary buffers. This is used to make the data sent back and forth smaller, and allow binary data to be embedded for ASMJS speed.

[```deep-defaults```](https://github.com/d5/deep-defaults) - Takes an object and compares it to another object, which is the _default_ object. If any key from the default object is missing in the input object, the default object's key and value is added to the input object. In other words, it merges the two objects, and input writes over all keys in defaults that it has inside of it. If that makes no sense, check the [README](https://github.com/d5/deep-defaults/blob/master/README.md) for ```deep-defaults```

[```idgen```](https://github.com/carlos8f/node-idgen) - Creates a unique ID. This will be used for the hashcash later on.

[```hashcashgen```](https://github.com/carlos8f/node-hashcashgen) - Helps prevent spam by requiring the user to prove they solved a math equation in the form of a hash. I could explain it here, but [this website](http://hashcash.org/) does a much better job.

[```request```](https://github.com/request/request) - Used in the client. Requests the worker file to be executed.

[```binarysearch```](https://github.com/soldair/node-binarysearch) - Searches the index of not solved pieces of work a lot faster than a normal for-loop search.

[```death```](https://github.com/jprichardson/node-death) - Catches the client exiting so temporary files can be deleted.

## How do I use it?

The library is going under some massive changes, and so is this documentation. Check back later.

## What are runners?

Distri was made to be agnostic in pretty much all contexts, databases, purpose, and also language. Yes, this version is programmed in Node.js, but I do plan to make more versoins for different things, like Python, Ruby, Java, and other things like that. (That is, if I can't get it merged into Honeybee-Hive.) With it being as agnostic as possible, it was also made to be able to support different languages as runners from the start. So, that begs the question, what are runners?

When a client requests work for the first time in their session, they have no idea what they'll get. They need instructions. Have fun trying to compute a fibonnaci sequence with a blank file.

So, when a client requests work, they are given a link they are going to fetch, and then that link should return a file. That file has what's needed inside it. The server and client work out what is and is not supported, so all you need to do is link to the supported types, which we'll get to in a second.

In the upcoming examples, Node.js is used. However, any language can be used as long as it has a package that supports MessagePack and can interact with the outside environment using ```stdout``` and ```stdin```. 

An example file for computing factorials is hosted at [https://drive.google.com/uc?export=download&id=0BwAlDZA3kaQAdGNSZUtTdmlfSU0](https://drive.google.com/uc?export=download&id=0BwAlDZA3kaQAdGNSZUtTdmlfSU0). This file is written in Node, and uses all that stuff. So, let's take a look at it, as this is how worker files need to be structured.

When the file runs, it writes 'ready' to ```stdout```. This tells the client the process is ready to start accepting work. Then there's an event listener for when ever the process receives data through ```stdin```. Inside this event listener, the data passed through is unpacked using MessagePack, and what's held inside the data property is used to calculate the factorial of the number. This number is then packaged and written to ```stdout```, which the client will pick up and send to the server. Here's the file in whole. (Commented)

```javascript
// require message pack so JSON can be transmitted as binary data
const msg = require('msgpack') 

// tell the client that the process is ready to start recieving
process.stdout.write('ready')

// when something is recivied in stdin
process.stdin.on('data', (m) => {
    // unpack the message
    const message = msg.unpack(m)
    
    // get the number from the message
    let num = message.data 
    
    // calculate its factorial
    for (let x = 1; x < message.data; x++) {
        num *= x
    }
    
    // write to stdout the result
    process.stdout.write(msg.pack({data:num}))
})
```

This is the outline for a worker file.

## How do I add these files?

To add files, simply a files object in the server options with keys corresponding to the chart below, and values of the _online links_ to the files. As of now, archives are not supported (zip, tar.gz, 7z) but it is planned to be in the future.

|Type| Description|
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ```g++```        | Currently not working. Uses standard library ```cout``` for output (```std::cout<< some_result << std::endl```) and ```cin``` for input (```cin >> work```) |
| ```gcc```        | Currently not working. Uses ```printf()``` for output and ```fgets()`` for input.                                                                           |
| ```javascript``` | Uses Web Worker messages to comunicate.  The ```onmessage``` function in the webworker will recieve an object. Access ```receivedObj.data.work``` for the work. When sending back the result using ```postMessage(result```, it must be put inside an object or else an error will be thrown. The work must be stored in the ```work``` property of the object.|
| ```node``` | A Node.js file, communicates using ```process.stdout.write()``` and ```process.stdin.on(data, callback)``` |
So, for an example -

```javascript
const Server = new distri.DistriServer({
    // other options
    files: {
        node: 'https://drive.google.com/uc?export=download&id=0BwAlDZA3kaQAdGNSZUtTdmlfSU0'
    }
})
```

This will load the factorial file in the client and then they can be on their merry way. 

You can put more than one file in -

```javascript
const Server = new distri.DistriServer({
    // other options
    files: {
        node: 'https://drive.google.com/uc?export=download&id=0BwAlDZA3kaQAdGNSZUtTdmlfSU0',
        'g++': 'some-link-that-doesnt-exist',
        gcc: 'c.com why not'
    }
})
```

The best one will be chosen for the client. (Compiled languages have the highest priority, but if that's not supported, next is mature interpreted languages, and if none of those are supported, new interpreted languages, and then the rest of the bunch).

If anything is confusing, just leave a comment.


