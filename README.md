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

## So how do I actually use it?

Cue documentation!

## Distri Server documentation

```javascript
const distri = require('distri-node')

const Server = new distri.DistriServer({options})

```

#### class ```distri#DistriServer```

A class that extends ```events.EventEmitter```.

#### Constructor options:

###### ```connection```: 

__Description__: The options of the WebSocket server.

__Type__: Object

For information on what to populate this object with (this object __must__ be present!), check the options part [here](https://github.com/websockets/ws/blob/master/doc/ws.md#new-wsserveroptions-callback).

###### ```work```: 

__Description__: An array of the work that will be distributed to clients.

__Type__: Array

__Default__: ```[1]```

##### ```security```

__Description__: An object with security options.

__Type__: Object

__Default__: 
```javascript
{
    /*
        * Verification strength is how many times the same piece of work must be completed 
        * with to be checked. The answer is checked by seeing if all answers are the same, and
        * if not, satisfy some sort of percentage that will be explained below.
    */
    'verificationStrength': 1,
    
    /*
        * Distri-Node uses the hashcashgen algorithm to prevent spam. How it works is it
        * sends the user a hash to solve using math, and they must send back the correct
        * answer to a randomly generated equation, which the server already knows.
        * Hashcash is easy on the server, but requires a little work on the client
        * side. The strength is how strong (or long) the equation is. It's recommended to
        * stay under 10 in this case, as higher could stall the user's computer.
    */
    
    'hashStrength': 3,
    
    /*
        * This is where failed verifications are handled. If not all submitted solutions
        * are the same, each solution will be sorted according to how often they
        * occur, and then they will be sorted by percent that they take up the 
        * submitted solutions. So, for example, if the submitted solutions are
        * [1,1,2,3], [1] takes up 50% of the submitted solutions, [2] takes up
        * 25% of the submitted solutions, and [3] takes up 25% of the submitted
        * solutions. Since [1] occurs the most, it will be accepted as the temporary
        * answer and see if the percent that it takes up of the total solutions
        * is greater than the equalityPercentage options you put inside the 
        * security object. If it is greater or equal to it, it will
        * be accepted as the answer. If not, the solutions will be cleared
        * and the question will be reset, and available to be worked on
        * again.
        *
        * QUICK TIP: If you don't care about the percentage of the
        * solution occurance and just want the one that occurs the most,
        * set this number to 0.
    */
    
    'equalityPercentage': 100,
    
    /*
        * The minumum amount of connected clients required to start distributing work.
    */
    
    'minUsers': 1,
    
    /*
        * If a user sends an invalid request and strict is true, they will be
        * kicked off the system.
    */
    
    'strict': false
    
}
```

##### ```mode```:

__Description__: An object that tells Distri how to store internal data (work, solutions, sessions, etc...)

__Type__: Object

__Default__:
```javascript
{
    /* 
        * If dynamic typing is used, the session will be stored in a JSON object.
        * This is okay for small projects where access speed is not critical, but
        * it has a lookup time of O(n), which can be a problem. 
        *
        * There is a second mode, 'static', which is much faster. It has a lookup
        * time of O(1), however you are much more restricted in how you can do
        * certain things. If you you decide to stick with dynamic typing, ignore the rest of 
        * this chunk of the documentation and go right to the bit about WebSocket
        * servers. You can simply leave these blank, as the JavaScript interpreter
        * will handle this for you. If not, read on.
    */    
    'typing': 'dynamic',
    
    /*
        * There are three types for 'type. Either 'Int', 'UInt', or ''. If
        * left empty, it will default to reading a string. Byte length is
        * how many bytes the number will take up. If it is a string, this
        * number will be ignored.
    */
    'input': {
        'type': 'Int',
        'byteLength': 5
    },
    
    /*
        * Same as above, except byteLength is not ignored for strings.
    */
    'output': {
        'type': 'Int',
        'byteLength': 5
    },
    
    /*
        * The endianess for the storage, if the work or solution type is a number. Can be either 
        * 'BE' or 'LE'.
    */
    'endianess': 'BE'
}
```

##### ```files```:

__Description__: An object containing links for files of certain runners. (Look below for a better explanation)

__Type__: Object

__Default__: None

#### Websocket Server ```Server.server```:

__Description__: A server generated by the [```ws```](https://github.com/websockets/ws) module.

__Type__: ```ws.Server```

__Default__: None


### Server Events

#### Event ```workgroup_complete```:

__Description__: Will fire when a group of workers have submitted their solutions and it passes the tests.

__Return Values__: Will return the input and output work into a callback.

__Example__: 
```javascript
Server.on('workgroup_complete', (input, output) => {
    // if you're using redis, you could do this -
    redis.hmset(someHash, input, output) // :D
})
```


#### Event ```all_work_complete```:

__Description__: Will fire when all work has been solved by workgroups.

__Return Values__: None

__Example__: 
```javascript
Server.on('all_work_complete', () => {
    Server.addWork([5,6,7,8]) // check below!
})
```


### Server Functions

#### ```Server.addWork(Array)```

__Parameters__: One nicely done array.

__Description__: Will add work to the work queue.


## Distri Client Documentation

```javascript
const distri = require('distri-node')

const client = new distri.DistriClient(opts)
```

### class ```distri#DistriClient```

Just a boring old class.

#### Constructor options:

###### ```host```:

__Description__: A WebSocket URL to connect to.

__Type__: String

__Default__: ```ws://localhost:8080```



#### Websocket Client

```Client.client``` is a [```ws```](https://github.com/websockets/ws) module client, so everything from that applies there.

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

|```node```| A Node.js file. Uses ```process.stdout.write``` for output, and has an event listener on ```process.stdin```, which has data packed using MessagePack.   |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ```g++```        | Currently not working. Uses standard library ```cout``` for output (```std::cout<< some_result << std::endl```) and ```cin``` for input (```cin >> work```) |
| ```gcc```        | Currently not working. Uses ```printf()``` for output and ```fgets()`` for input.                                                                           |
| ```javascript``` | In progress. Uses Web Worker messages to communicate with the client. Will not work in any other environment then the browser.                              |

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


