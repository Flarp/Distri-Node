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


