# Distri-Node

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

###### ```port```: 

__Description__: The port the server will run off of.

__Type__: Integer

__Default__: 8080

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

__Note__: Will crash if using static mode.


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

# More will be put here soon!






