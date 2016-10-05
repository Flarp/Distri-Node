# Distri-Node

Distributed computing in Node!

## What is distributed computing?

Alright, so I have this problem, let's say for now it's ```x + 1```. I have ten values that can go in place of x. Let's say it's ```[0,1,2,3,4,5,6,7,8,9]```

The answers would be ```[1, 2, 3, 4...]``` and so on.

But, why waste computing power to do that problem? There are plenty of other computers in the world that could solve that problem without a sweat. And that's what distributed computing is. I can send each one of those numbers off to someone else, and their computer will calculate it, and then the result back. Using the example above, if a user recieved ```1```, they would return ```2``` to the server. 

Another beautiful thing is that, if you do it right, multiple users can join and each take one of those numbers, which for the rest of this documentation, we will call __work__. One user can be calculating one of those values, another user could be calculating another value, all at the same time. If you have ten users, that problem will be solved ten times faster.

Now, obviously a computer can solve the example above in a heartbeat. But when it comes to more complicated mathmatical formulas, computers can get a little tripped up. This library is for a set of values that need to be put into some function, and be given a result. The downfall of this method is that _all values must be independent of each other_. That means the next value in the set cannot be the solution of the previous value in the set. That is a waste of time, and is highly illogical.

## Isn't that what BOINC is?

That's exactly what BOINC is!

## So why are you doing it again?

BOINC has its shortcomings, such as distributing executables, not source code, and other baloney. It also can't run in a browser, which is a huge shortcoming, because everyone has a browser. How are you viewing this? (Well, maybe you used Git and cloned the repo but I think you get the point.) Distri will allow you to give others source code, like JavaScript, WebAssembly, and C/C++ code to be compiled or interpreted, so what you're getting is not some strange mystery.

Also, this library uses WebSockets, so browsers aren't left out of the party. Everybody is included in the fun.

## But I wanna protect my code from evil hackers!

You could always put the code under a license, like the GPL or something of the sort. 

## But I don't wanna have anyone see my code, period!

That's something you need to work out. Distri is for open-source projects. 

## Alright, fine... so how do I use it?

Cue documentation!

### Distri Server documentation

```javascript
const distri = require('distri-node')

const Server = new distri.DistriServer({options})

```

#### class ```distri#DistriServer```

A class that extends ```events.EventEmitter```.

##### Constructor options:

###### ```port```: 

__Description__: The port the server will run off of.
__Type__: Integer
__Default__: 8080
    

######```work```: 

__Description__: An array of the work that will be distributed to clients.
__Type__: Array
__Default__: ```[1]```

#####```security```

__Description__: An object with security options.
__Type__: Object
__Default__: UNO MOMENTO.

