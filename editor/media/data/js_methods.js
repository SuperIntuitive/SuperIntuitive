
var si_jsobjects = {
    Array: {
        constructor: {
            type: "function",
            desc: "The Array object constructor",
            params:
                [
                    {
                        name: "items",
                        req: false,
                        type: "object",
                        desc: "The array items",
                        repeat: true
                    }
                ],
            returns: {
                desc: "An Array object with the items passed in as parameters",
                type: "array",
                over: true
            }
        },
        concat: {
            type: "function",
            desc: "Joins two or more arrays, and returns a copy of the joined arrays",
            params:
                [
                    {
                        name: "array2",
                        req: 1,
                        type: "array",
                        desc: "The arrays to be joined",
                        repeat: true
                    }
                ],
            returns: {
                desc: "An Array object, representing the joined array",
                type: "array",
                over: false
            }
        },
        copyWithin: {
            type: "function",
            desc: "Copies array elements within the array, to and from specified positions",
            returns: {
                name: "new array",
                type: "array",
                over: true
            },
            params:
                [
                    {
                        name: "target",
                        req: true,
                        type: "number",
                        desc: "The index position to copy the elements to"
                    },
                    {
                        name: "start",
                        req: false,
                        type: "number",
                        desc: "The index position to start copying elements from  (default is 0)"
                    },
                    {
                        name: "end",
                        req: false,
                        type: "number",
                        desc: "The index position to stop copying elements from (default is array.length)"
                    }
                ]
        },
        entries: {
            type: "function",
            desc: "Returns a key/value pair Array Iteration Object",
            params: [],
            returns: {
                name: "array iterator",
                type: "array",
                over: false
            }
        },
        every: {
            type: "function",
            desc: "Checks if every element in an array pass a test",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback function to be run for each element in the array",
                    params: [
                        {
                            name: "currentValue",
                            req: true,
                            type: "number",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ]
                },
                {
                    name: "thisValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                }
            ],
            returns: {
                name: "passed test",
                type: "boolean",
                over: false
            }
        },
        fill: {
            type: "function",
            desc: "Fill the elements in an array with a static value",
            params: [
                {
                    name: "value",
                    req: true,
                    type: "object",
                    desc: "The value to fill the array with"
                },
                {
                    name: "start",
                    req: false,
                    type: "number",
                    des: "The index to start filling the array (default is 0)"
                },
                {
                    name: "end",
                    req: false,
                    type: "number",
                    desc: "The index to start filling the array (default is array.length)"
                }
            ],
            returns: {
                name: "passed test",
                desc: "the new array filled with the value",
                type: "array",
                over: true
            }

        },
        filter: {
            type: "function",
            desc: "Creates a new array with every element in an array that pass a test",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback to be run for each element in the array",
                    params: [
                        {
                            name: "currentValue",
                            req: true,
                            type: "number",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ],
                },
                {
                    name: "thisValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                }
            ],
            returns: {
                name: "filtered array",
                desc: "An Array containing all the array elements that pass the test. If no elements pass the test it returns an empty array.",
                type: "array",
                over: false
            }
        },
        find: {
            type: "function",
            desc: "Returns a key/value pair Array Iteration Object",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback to be run for each element in the array",
                    params: [
                        {
                            name: "currentValue",
                            req: true,
                            type: "number",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ],
                },
                {
                    name: "thisValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                }
            ],
            returns: {
                name: "array iterator",
                type: "array",
                over: false
            }
        },
        findIndex: {
            type: "function",
            desc: "Returns a key/value pair Array Iteration Object",
            params:
                [
                    {
                        name: "callback",
                        req: true,
                        type: "function",
                        desc: "A callback to be run for each element in the array",
                        params: [
                            {
                                name: "currentValue",
                                req: true,
                                type: "number",
                                desc: "The value of the current element"
                            },
                            {
                                name: "index",
                                req: false,
                                type: "number",
                                desc: "The array index of the current element"
                            },
                            {
                                name: "array",
                                req: false,
                                type: "array",
                                desc: "The array object the current element belongs to"
                            }
                        ],
                    },
                    {
                        name: "thisValue",
                        req: false,
                        type: "self",
                        desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                    }
                ],
            returns: {
                desc: "Returns the first array element index if any of the elements in the array pass the test, otherwise it returns -1",
                name: "found index",
                type: "number",
                over: false
            }
        },
        forEach: {
            type: "function",
            desc: "Calls a function for each array element",
            params:
                [
                    {
                        name: "callback",
                        req: true,
                        type: "function",
                        desc: "A callback to be run for each element in the array",
                        params: [
                            {
                                name: "currentValue",
                                req: true,
                                type: "number",
                                desc: "The value of the current element"
                            },
                            {
                                name: "index",
                                req: false,
                                type: "number",
                                desc: "The array index of the current element"
                            },
                            {
                                name: "array",
                                req: false,
                                type: "array",
                                desc: "The array object the current element belongs to"
                            }
                        ],
                    },
                    {
                        name: "thisValue",
                        req: false,
                        type: "self",
                        desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                    }
                ],
            returns: {
                desc: "Returns undefined",
                name: "undefined",
                type: "undefined",
                over: true
            }
        },
        from: {
            type: "function",
            desc: "Creates an array from an object",
            params:
                [
                    {
                        name: "object",
                        req: true,
                        type: "object",
                        desc: "The object to convert to an array"
                    },
                    {
                        name: "mapFunction",
                        req: false,
                        type: "function",
                        desc: "A map function to call on each item of the array"
                    },
                    {
                        name: "thisValue",
                        req: false,
                        type: "self",
                        desc: "A value to use as this when executing the mapFunction"
                    }
                ],
            returns: {
                desc: "The array from the object",
                name: "object to array",
                type: "array",
                over: false
            }
        },
        includes: {
            type: "function",
            desc: "Check if an array contains the specified element",
            params:
                [
                    {
                        name: "element",
                        req: true,
                        type: "object",
                        desc: "The element to search for"
                    },
                    {
                        name: "start",
                        req: false,
                        type: "number",
                        desc: "At which position in the array to start the search"
                    },
                ],
            returns: {
                desc: "True if the element is found. False if not",
                name: "found",
                type: "boolean",
                over: false
            }
        },
        indexOf: {
            type: "function",
            desc: "Search the array for an element and returns its position",
            params:
                [
                    {
                        name: "element",
                        req: true,
                        type: "object",
                        desc: "The element to search for"
                    },
                    {
                        name: "start",
                        req: false,
                        type: "number",
                        desc: "Where to start the search. Negative values will start at the given position counting from the end, and search to the end."
                    },
                ],
            returns: {
                desc: "A Number, representing the position of the specified item, otherwise -1",
                name: "item index",
                type: "number",
                over: false
            }
        },
        isArray: {
            type: "function",
            desc: "Checks whether an object is an array",
            opts: ["ontype"],
            params:
                [
                    {
                        name: "object",
                        req: true,
                        type: "object",
                        desc: "The object to be tested"
                    },
                ],
            returns: {
                desc: "A Boolean. Returns true if the object is an array, otherwise it returns false",
                name: "is array",
                type: "boolean",
                over: false
            }
        },
        join: {
            type: "function",
            desc: "Joins all elements of an array into a string",
            params:
                [
                    {
                        name: "separator",
                        req: false,
                        type: "string",
                        desc: "The separator to be used. If omitted, the elements are separated with a comma"
                    },
                ],
            returns: {
                desc: "A String, representing the array values, separated by the specified separator",
                name: "joined string",
                type: "string",
                over: false
            }
        },
        keys: {
            type: "function",
            desc: "Returns a Array Iteration Object, containing the keys of the original array",
            params:
                [],
            returns: {
                desc: "An Array Iterator object",
                name: "array iterator",
                type: "array",
                over: false
            }
        },
        length: {
            type: "property",
            desc: "Sets or returns the number of elements in an array",
            params:
                [
                    {
                        name: "length",
                        req: false,
                        type: "number",
                        desc: "Used to set to total number of array elements"
                    },
                ],
            returns: {
                desc: "A Number, representing the number of elements in the array object",
                name: "array element count",
                type: "number",
                over: false
            }
        },
        lastIndexOf: {
            type: "function",
            desc: "Search the array for an element, starting at the end, and returns its position",
            params:
                [
                    {
                        name: "item",
                        req: true,
                        type: "object",
                        desc: "The item to search for"
                    },
                    {
                        name: "start",
                        req: false,
                        type: "number",
                        desc: "Where to start the search. Negative values will start at the given position counting from the end, and search to the beginning"
                    }
                ],
            returns: {
                desc: "A Number, representing the position of the specified item, otherwise -1",
                name: "index",
                type: "number",
                over: false
            }
        },
        map: {
            type: "function",
            desc: "Creates a new array with the result of calling a function for each array element",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback to be run for each element in the array",
                    params: [
                        {
                            name: "currentValue",
                            req: true,
                            type: "number",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ],
                },
                {
                    name: "thisValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                }
            ],
            returns: {
                desc: "An Array containing the results of calling the provided function for each element in the original array.",
                name: "results array",
                type: "array",
                over: false
            }
        },
        pop: {
            type: "function",
            desc: "Removes the last element of an array, and returns that element",
            params:
                [],
            returns: {
                desc: "Any type*, representing the removed array item. *An array item can be a string, a number, an array, a boolean, or any other object types that are allowed in an array.",
                name: "last element",
                type: "object",
                over: false
            }
        },
        "prototype": {
            type: "function",
            desc: "Allows you to add properties and methods to an Array object",
            params:
                [
                    {
                        name: "Property or Method",
                        req: 1,
                        type: "object",
                        desc: "the property of method that will be added to the Array() object",
                        params: [
                            {
                                name: "this",
                                req: false,
                                type: "self",
                                desc: "The calling array"
                            }
                        ],
                    }
                ],
            returns: {
                desc: "Returns function created",
                name: "array function",
                type: "function",
                over: false
            }
        },
        push: {
            type: "function",
            desc: "Adds new elements to the end of an array, and returns the new length",
            params:
                [
                    {
                        name: "element to add",
                        req: 1,
                        type: "object",
                        desc: "The item(s) to add to the array",
                        repeat: true
                    }
                ],
            returns: {
                desc: "A Number, representing the new length of the array",
                name: "item count",
                type: "number",
                over: true
            }
        },
        reduce: {
            type: "function",
            desc: "Reduce the values of an array to a single value (going left-to-right)",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback to be run for each element in the array",
                    params: [
                        {
                            name: "total",
                            req: true,
                            type: "object",
                            desc: "The initialValue, or the previously returned value of the function"
                        },
                        {
                            name: "currentValue",
                            req: true,
                            type: "object",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ],
                },
                {
                    name: "initialValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function as the initial value"
                }
            ],
            returns: {
                desc: "Returns the accumulated result from the last call of the callback function",
                name: "result",
                type: "object",
                over: false
            }
        },
        reduceRight: {
            type: "function",
            desc: "Reduce the values of an array to a single value (going right-to-left)",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback to be run for each element in the array",
                    params: [
                        {
                            name: "total",
                            req: true,
                            type: "object",
                            desc: "The initialValue, or the previously returned value of the function"
                        },
                        {
                            name: "currentValue",
                            req: true,
                            type: "object",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ],
                },
                {
                    name: "initialValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function as the initial value"
                }
            ],
            returns: {
                desc: "Returns the accumulated result from the last call of the callback function",
                name: "result",
                type: "object",
                over: false
            }
        },
        reverse: {
            type: "function",
            desc: "Reverses the order of the elements in an array",
            params:
                [],
            returns: {
                desc: "An Array, representing the array after it has been reversed",
                name: "reversed array",
                type: "array",
                over: true
            }
        },
        shift: {
            type: "function",
            desc: "Removes the first element of an array, and returns that element",
            params: [],
            returns: {
                desc: "Any type*, representing the removed array item. *An array item can be a string, a number, an array, a boolean, or any other object types that are allowed in an array.",
                name: "first element",
                type: "object",
                over: true
            }
        },
        slice: {
            type: "function",
            desc: "Selects a part of an array, and returns the new array",
            params:
                [
                    {
                        name: "start",
                        req: false,
                        type: "number",
                        desc: "An integer that specifies where to start the selection (The first element has an index of 0). Use negative numbers to select from the end of an array. If omitted, it acts like '0'",
                    },
                    {
                        name: "end",
                        req: false,
                        type: "number",
                        desc: "An integer that specifies where to end the selection. If omitted, all elements from the start position and to the end of the array will be selected. Use negative numbers to select from the end of an array",
                    }
                ],
            returns: {
                desc: "A new Array, containing the selected elements",
                name: "selected elements",
                type: "array",
                over: false
            }
        },
        some: {
            type: "function",
            desc: "Checks if any of the elements in an array pass a test",
            params: [
                {
                    name: "callback",
                    req: true,
                    type: "function",
                    desc: "A callback to be run for each element in the array",
                    params: [
                        {
                            name: "currentValue",
                            req: true,
                            type: "number",
                            desc: "The value of the current element"
                        },
                        {
                            name: "index",
                            req: false,
                            type: "number",
                            desc: "The array index of the current element"
                        },
                        {
                            name: "array",
                            req: false,
                            type: "array",
                            desc: "The array object the current element belongs to"
                        }
                    ],
                },
                {
                    name: "thisValue",
                    req: false,
                    type: "self",
                    desc: "A value to be passed to the function to be used as its 'this' value. If this parameter is empty, the value 'undefined' will be passed as its 'this' value"
                }
            ],
            returns: {
                desc: "Returns true if any of the elements in the array pass the test, otherwise it returns false",
                name: "has some",
                type: "boolean",
                over: false
            }
        },
        sort: {
            type: "function",
            desc: "Sorts the elements of an array",
            params:
                [
                    {
                        name: "callback",
                        req: false,
                        type: "function",
                        desc: "A callback to be run to sort each element in the array",
                        params: [
                            {
                                name: "value1",
                                req: true,
                                type: "object",
                                desc: "The first value to compare"
                            },
                            {
                                name: "value2",
                                req: true,
                                type: "object",
                                desc: "The second value to compare"
                            }
                        ],
                        returns: {
                            desc: "When the sort() method compares two values, it sends the values to the compare function, and sorts the values according to the returned (negative, zero, positive) value.",
                            name: "negative, zero, positive",
                            type: "number",
                            over: false
                        }
                    },
                ],
            returns: {
                desc: "The Array object, with the items sorted",
                name: "sorted array",
                type: "array",
                over: false
            }
        },
        splice: {
            type: "function",
            desc: "Adds/Removes elements from an array",
            params:
                [
                    {
                        name: "index",
                        req: true,
                        type: "number",
                        desc: "An integer that specifies at what position to add/remove items, Use negative values to specify the position from the end of the array"
                    },
                    {
                        name: "howmany",
                        req: false,
                        type: "number",
                        desc: "The number of items to be removed. If set to 0, no items will be removed"
                    },
                    {
                        name: "items",
                        req: false,
                        type: "object",
                        desc: "The new item(s) to be added to the array",
                        repeat: true
                    }
                ],
            returns: {
                desc: "A new Array, containing the removed items (if any)",
                name: "removed elements",
                type: "array",
                over: true
            }
        },
        toString: {
            type: "function",
            desc: "Converts an array to a string, and returns the result",
            params:
                [],
            returns: {
                desc: "A String, representing the values of the array, separated by a comma",
                name: "array text",
                type: "string",
                over: false
            }
        },
        unshift: {
            type: "function",
            desc: "Adds new elements to the beginning of an array, and returns the new length",
            params:
                [
                    {
                        name: "items",
                        req: false,
                        type: "object",
                        desc: "The new item(s) to be added to the array",
                        repeat: true
                    }
                ],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: true
            }
        },
        valueOf: {
            type: "function",
            desc: "Returns the primitive value of an array",
            params:
                [],
            returns: {
                desc: "The valueOf() method returns itself",
                name: "",
                type: "array",
                over: false
            }
        },
    },
    "Boolean": {
        constructor: {
            type: "function",
            desc: "The Boolean object constructor",
            params:
                [
                    {
                        name: "true or false",
                        req: false,
                        type: "boolean",
                        desc: "The initial true or false state of the boolean",
                    }
                ],
            returns: {
                desc: "The current value of the boolean either true or false",
                type: "boolean",
                over: true
            }
        },
        "prototype": {

            type: "function",
            desc: "Allows you to add properties and methods to the boolean object",
            params:
                [
                    {
                        name: "Property or Method",
                        req: 1,
                        type: "object",
                        desc: "the property of method that will be added to the Boolean() object",
                        params: [
                            {
                                name: "this",
                                req: false,
                                type: "self",
                                desc: "The calling bool"
                            }
                        ],
                    }
                ],
            returns: {
                desc: "Returns function created",
                name: "boolean function",
                type: "function",
                over: false
            }
        },
        toString: {
            type: "function",
            desc: "Converts a bool to a string, and returns the result",
            params:
                [],
            returns: {
                desc: "A String, either true or false",
                name: "boolean text",
                type: "string",
                over: false
            }
        },
        valueOf: {
            type: "function",
            desc: "Returns the primitive value of an boolean",
            params:
                [],
            returns: {
                desc: "The valueOf() method returns itself",
                name: "current value",
                type: "boolean",
                over: false
            }
        },
    },
    Date: {
        getDate: {
            type: "function",
            desc: "Returns the day of the month (from 1-31)",
            name: "day of the month",
            params: [],
            returns: {
                desc: "A Number, from 1 to 31, representing the day of the month",
                name: "day of the month",
                type: "number",
                over: false
            }
        },
        getDay: {
            type: "function",
            desc: "Returns the day of the week (from 0-6)",
            name: "day of the week",
            params: [],
            returns: {
                desc: "A Number, from 0 to 6, representing the day of the week",
                name: "day of the week",
                type: "number",
                over: false
            }
        },
        getFullYear: {
            name: "Get Year",
            type: "function",
            desc: "Returns the year",
            params: [],
            returns: {
                desc: "A Number, representing the year of the specified date",
                name: "year",
                type: "array",
                over: false
            }
        },
        getHours: {
            name: "hour",
            type: "function",
            desc: "Returns the hour (from 0-23)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getMilliseconds: {
            name: "millisecond",
            type: "function",
            desc: "Returns the milliseconds (from 0-999)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getMinutes: {
            name: "minute",
            type: "function",
            desc: "Returns the minutes (from 0-59)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getMonth: {
            name: "month",
            type: "function",
            desc: "Returns the month (from 0-11)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getSeconds: {
            name: "second",
            type: "function",
            desc: "Returns the seconds (from 0-59)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getTime: {
            name: "",
            type: "function",
            desc: "Returns the number of milliseconds since midnight Jan 1 1970, and a specified date",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getTimezoneOffset: {
            name: "",
            type: "function",
            desc: "Returns the time difference between UTC time and local time, in minutes",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCDate: {
            name: "",
            type: "function",
            desc: "Returns the day of the month, according to universal time (from 1-31)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCDay: {
            name: "",
            type: "function",
            desc: "Returns the day of the week, according to universal time (from 0-6)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCFullYear: {
            name: "",
            type: "function",
            desc: "Returns the year, according to universal time",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCHours: {
            name: "",
            type: "function",
            desc: "Returns the hour, according to universal time (from 0-23)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCMilliseconds: {
            name: "",
            type: "function",
            desc: "Returns the milliseconds, according to universal time (from 0-999)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCMinutes: {
            name: "",
            type: "function",
            desc: "Returns the minutes, according to universal time (from 0-59)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCMonth: {
            name: "",
            type: "function",
            desc: "Returns the month, according to universal time (from 0-11)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        getUTCSeconds: {
            name: "",
            type: "function",
            desc: "Returns the seconds, according to universal time (from 0-59)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "array",
                over: false
            },
        },
        now: {
            name: "",
            type: "function",
            desc: "Returns the number of milliseconds since midnight Jan 1, 1970",
            params: [],
            returns: {
                desc: "A Number, representing the number of milliseconds since midnight January 1, 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        parse: {
            name: "",
            type: "function",
            desc: "Parses a date string and returns the number of milliseconds since January 1, 1970",
            params: [
                {
                    name: "datestring",
                    req: true,
                    type: "string",
                    desc: "A string representing a date"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds since midnight January 1, 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setDate: {
            name: "",
            type: "function",
            desc: "Sets the day of the month of a date object",
            params: [
                {
                    name: "day",
                    req: true,
                    type: "number",
                    desc: "An integer representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setFullYear: {
            name: "",
            type: "function",
            desc: "Sets the year of a date object",
            params: [
                {
                    name: "year",
                    req: true,
                    type: "number",
                    desc: "An number representing the year."
                },
                {
                    name: "month",
                    req: false,
                    type: "number",
                    desc: "An number representing the month of the year 1-11, negitive for the past, over 11 for future"
                },
                {
                    name: "day",
                    req: false,
                    type: "number",
                    desc: "An number representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setHours: {
            name: "",
            type: "function",
            desc: "Sets the hour of a date object",
            params: [
                {
                    name: "hour",
                    req: true,
                    type: "number",
                    desc: "A number representing the hour"
                },
                {
                    name: "minute",
                    req: false,
                    type: "number",
                    desc: "A number representing the minutes"
                },
                {
                    name: "second",
                    req: false,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setMilliseconds: {
            name: "",
            type: "function",
            desc: "Sets the milliseconds of a date object",
            params: [
                {
                    name: "millisecond",
                    req: true,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setMinutes: {
            name: "",
            type: "function",
            desc: "Set the minutes of a date object",
            params: [
                {
                    name: "minute",
                    req: true,
                    type: "number",
                    desc: "A number representing the minutes"
                },
                {
                    name: "second",
                    req: false,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setMonth: {
            name: "",
            type: "function",
            desc: "Sets the month of a date object",
            params: [
                {
                    name: "month",
                    req: true,
                    type: "number",
                    desc: "An number representing the month of the year 1-11, negitive for the past, over 11 for future"
                },
                {
                    name: "day",
                    req: false,
                    type: "number",
                    desc: "An number representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setSeconds: {
            name: "",
            type: "function",
            desc: "Sets the seconds of a date object",
            params: [
                {
                    name: "second",
                    req: true,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setTime: {
            name: "",
            type: "function",
            desc: "Sets a date to a specified number of milliseconds after/before January 1, 1970",
            params: [
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCDate: {
            name: "",
            type: "function",
            desc: "Sets the day of the month of a date object, according to universal time",
            params: [
                {
                    name: "day",
                    req: false,
                    type: "number",
                    desc: "An number representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCFullYear: {
            name: "",
            type: "function",
            desc: "Sets the year of a date object, according to universal time",
            params: [
                {
                    name: "year",
                    req: true,
                    type: "number",
                    desc: "An number representing the year."
                },
                {
                    name: "month",
                    req: false,
                    type: "number",
                    desc: "An number representing the month of the year 1-11, negitive for the past, over 11 for future"
                },
                {
                    name: "day",
                    req: false,
                    type: "number",
                    desc: "An number representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCHours: {
            name: "",
            type: "function",
            desc: "Sets the hour of a date object, according to universal time",
            params: [
                {
                    name: "hour",
                    req: true,
                    type: "number",
                    desc: "A number representing the hour"
                },
                {
                    name: "minute",
                    req: false,
                    type: "number",
                    desc: "A number representing the minutes"
                },
                {
                    name: "second",
                    req: false,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCMilliseconds: {
            name: "",
            type: "function",
            desc: "Sets the milliseconds of a date object, according to universal time",
            params: [
                {
                    name: "millisecond",
                    req: true,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCMinutes: {
            name: "",
            type: "function",
            desc: "Set the minutes of a date object, according to universal time",
            params: [
                {
                    name: "minute",
                    req: true,
                    type: "number",
                    desc: "A number representing the minutes"
                },
                {
                    name: "second",
                    req: false,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCMonth: {
            name: "",
            type: "function",
            desc: "Sets the month of a date object, according to universal time",
            params: [
                {
                    name: "month",
                    req: true,
                    type: "number",
                    desc: "An number representing the month of the year 1-11, negitive for the past, over 11 for future"
                },
                {
                    name: "day",
                    req: false,
                    type: "number",
                    desc: "An number representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        setUTCSeconds: {
            name: "",
            type: "function",
            desc: "Set the seconds of a date object, according to universal time",
            params: [
                {
                    name: "second",
                    req: true,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        toDateString: {
            name: "date string",
            type: "function",
            desc: "Converts the date portion of a Date object into a readable string",
            params: [],
            returns: {
                desc: "A String, representing the date as a string",
                name: "datestring",
                type: "string",
                over: false
            },
        },
        toISOString: {
            name: "",
            type: "function",
            desc: "Returns the date as a string, using the ISO standard",
            params: [],
            returns: {
                desc: "A String, representing the date and time using the ISO standard format",
                name: "date iso string",
                type: "string",
                over: false
            },
        },
        toJSON: {
            name: "",
            type: "function",
            desc: "Returns the date as a string, formatted as a JSON date",
            params: [],
            returns: {
                desc: "A String, representing the date and time formated as a JSON date",
                name: "date json string",
                type: "string",
                over: false
            },
        },
        toLocaleDateString: {
            name: "",
            type: "function",
            desc: "Returns the date portion of a Date object as a string, using locale conventions",
            params: [],
            returns: {
                desc: "A String, representing the local date as a string",
                name: "date local string",
                type: "string",
                over: false
            },
        },
        toLocaleTimeString: {
            name: "",
            type: "function",
            desc: "Returns the time portion of a Date object as a string, using locale conventions",
            params: [],
            returns: {
                desc: "A String, representing the local time as a string",
                name: "time local string",
                type: "string",
                over: false
            },
        },
        toLocaleString: {
            name: "",
            type: "function",
            desc: "Converts a Date object to a string, using locale conventions",
            params: [],
            returns: {
                desc: "A String, representing the date and time as a string",
                name: "date time local string",
                type: "string",
                over: false
            },
        },
        toString: {
            name: "",
            type: "function",
            desc: "Converts a Date object to a string",
            params: [],
            returns: {
                desc: "A String, representing the date and time as a string",
                name: "date time string",
                type: "string",
                over: false
            },
        },
        toTimeString: {
            name: "",
            type: "function",
            desc: "Converts the time portion of a Date object to a string",
            params: [],
            returns: {
                desc: "A String, representing the time as a string",
                name: "timestring",
                type: "string",
                over: false
            },
        },
        toUTCString: {
            name: "",
            type: "function",
            desc: "Converts a Date object to a string, according to universal time",
            params: [],
            returns: {
                desc: "	A String, representing the UTC date and time as a string",
                name: "utc string",
                type: "string",
                over: false
            },
        },
        UTC: {
            name: "",
            type: "function",
            desc: "Returns the number of milliseconds in a date since midnight of January 1, 1970, according to UTC time",
            params: [
                {
                    name: "year",
                    req: true,
                    type: "number",
                    desc: "An number representing the year."
                },
                {
                    name: "month",
                    req: true,
                    type: "number",
                    desc: "An number representing the month of the year 1-11, negitive for the past, over 11 for future"
                },
                {
                    name: "day",
                    req: false,
                    type: "number",
                    desc: "An number representing the day of a month. 1-31for this month, negitive for the past, over 31 for future "
                },
                {
                    name: "hour",
                    req: false,
                    type: "number",
                    desc: "A number representing the hour"
                },
                {
                    name: "minute",
                    req: false,
                    type: "number",
                    desc: "A number representing the minutes"
                },
                {
                    name: "second",
                    req: false,
                    type: "number",
                    desc: "A number representing the seconds"
                },
                {
                    name: "millisecond",
                    req: false,
                    type: "number",
                    desc: "A number representing 1000ths of a second"
                }
            ],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
        valueOf: {
            name: "",
            type: "function",
            desc: "Returns the primitive value of a Date object",
            params: [],
            returns: {
                desc: "A Number, representing the number of milliseconds between the date object and midnight January 1 1970",
                name: "epoch",
                type: "number",
                over: false
            },
        },
    },
    Error: {
        name: {
            type: "property",
            desc: "Sets or returns an error name",
            returns: {
                desc: "A String, representing the name of the error. [EvalError,RangeError,ReferenceError,SyntaxError,TypeError,URIError]",
                name: "error type",
                type: "string",
                over: false
            }
        },
        message: {
            type: "function",
            desc: "Sets or returns an error message (a string)",
            returns: {
                desc: "A String, representing a description of an error (varies depending on the browser)",
                name: "error message",
                type: "string",
                over: false
            }
        },
    },
    Global: {
        Infinity: {
            type: "property",
            desc: "A numeric value that represents positive/negative infinity",
            returns: {
                desc: "If the number is greate than the max number 'Infinity', if less than the min number '-Infinity' ",
                name: "infinity",
                type: "string",
                over: false
            }
        },
        NaN: {
            type: "property",
            desc: "Not-a-Number value",
            returns: {
                desc: "If the object is Not a Number 'NaN' will be the value",
                name: "Not A Number",
                type: "string",
                over: false
            }
        },
        undefined: {
            type: "property",
            desc: "Indicates that a variable has not been assigned a value",
            returns: {
                desc: "",
                name: "undefined",
                type: "string",
                over: false
            }
        },
        decodeURI: {
            type: "function",
            desc: "Decodes a URI",
            params: [
                {
                    name: "uri",
                    req: true,
                    type: "string",
                    desc: "The URI to be decoded"
                },
            ],
            returns: {
                desc: "A String, representing the decoded URI",
                name: "decoded uri",
                type: "string",
                over: false
            }
        },
        decodeURIComponent: {
            type: "function",
            desc: "Decodes a URI component",
            params: [
                {
                    name: "uri",
                    req: true,
                    type: "string",
                    desc: "The URI to be decoded"
                },
            ],
            returns: {
                desc: "A String, representing the decoded URI",
                name: "decoded uri",
                type: "string",
                over: false
            }
        },
        encodeURI: {
            type: "function",
            desc: "Encodes a URI",
            params: [
                {
                    name: "uri",
                    req: true,
                    type: "string",
                    desc: "The URI to be encoded"
                },
            ],
            returns: {
                desc: "A String, representing the encoded URI",
                name: "encoded uri",
                type: "string",
                over: false
            }
        },
        encodeURIComponent: {
            type: "function",
            desc: "Encodes a URI component",
            params: [
                {
                    name: "uri",
                    req: true,
                    type: "string",
                    desc: "The URI to be encoded"
                },
            ],
            returns: {
                desc: "A String, representing the encoded URI",
                name: "encoded uri",
                type: "string",
                over: false
            }
        },
        eval: {
            type: "function",
            desc: "Evaluates a string and executes it as if it was script code",
            params: [],
            returns: {
                desc: "A JavaScript expression, variable, statement, or sequence of statements",
                name: "string to eval run",
                type: "string",
                over: false
            }
        },
        isFinite: {
            type: "function",
            desc: "Determines whether a value is a finite, legal number",
            params: [
                {
                    name: "value",
                    req: true,
                    type: "object",
                    desc: "The value to be tested"
                },
            ],
            returns: {
                desc: "Returns false if the value is +infinity, -infinity, or NaN, otherwise it returns true.",
                name: "result",
                type: "boolean",
                over: false
            }
        },
        isNaN: {
            type: "function",
            desc: "Determines whether a value is an illegal number",
            params: [
                {
                    name: "value",
                    req: true,
                    type: "object",
                    desc: "The value to be tested"
                },
            ],
            returns: {
                desc: "A Boolean. Returns true if the value is NaN, otherwise it returns false",
                name: "result",
                type: "boolean",
                over: false
            }
        },
        Number: {
            type: "function",
            desc: "Converts an object's value to a number",
            params: [
                {
                    name: "to number",
                    req: false,
                    type: "object",
                    desc: "A JavaScript object. If no argument is provided, it returns 0."
                },
            ],
            returns: {
                desc: "A Number. Returns different object values to their numbers. If the value cannot be converted to a legal number, NaN is returned. If no argument is provided, it returns 0.",
                name: "number",
                type: "number",
                over: false
            }
        },
        parseFloat: {
            type: "function",
            desc: "Parses a string and returns a floating point number",
            params: [
                {
                    name: "string to parse",
                    req: true,
                    type: "object",
                    desc: "A string to parse into a number"
                },
            ],
            returns: {
                desc: "A Number. If the first character cannot be converted to a number, NaN is returned",
                name: "clean float",
                type: "number",
                over: false
            }
        },
        parseInt: {
            type: "function",
            desc: "Parses a string and returns an integer",
            params: [
                {
                    name: "string to parse",
                    req: true,
                    type: "object",
                    desc: "A string to parse into a number"
                },
                {
                    name: "radix",
                    req: false,
                    type: "number",
                    max: 36,
                    min: 2,
                    desc: "A number (from 2 to 36) that represents the numeral system to be used"
                },
            ],
            returns: {
                desc: "A Number. If the first character cannot be converted to a number, NaN is returned",
                name: "clean int",
                type: "number",
                over: false
            }
        },
        String: {
            type: "function",
            desc: "Converts an object's value to a string		",
            params: [
                {
                    name: "object to string",
                    req: true,
                    type: "object",
                    desc: "A object that will be converted into a string"
                },
            ],
            returns: {
                desc: "The resulting string",
                name: "new string",
                type: "string",
                over: false
            }
        },
    },
    JSON: {
        parse: {
            type: "function",
            desc: "Parses a JSON string and returns a JavaScript object",
            params: [
                {
                    name: "string to object",
                    req: true,
                    type: "string",
                    desc: "A string that will be converted into a object"
                },
                {
                    name: "reviver function",
                    req: false,
                    type: "callback",
                    desc: "A function that is run on each item in the object",
                    params: [
                        {
                            name: "key",
                            req: false,
                            type: "object",//really just number or string
                            desc: "The key of the current JSON element"
                        },
                        {
                            name: "value",
                            req: false,
                            type: "object",
                            desc: "The value of the current JSON element"
                        },
                    ]
                },
            ],
            returns: {
                desc: "a object created from the string parameter",
                name: "JSON object",
                type: "object",
                over: false
            }
        },
        stringify: {
            type: "function",
            desc: "Convert a JavaScript object to a JSON string",
            params: [
                {
                    name: "object to string",
                    req: true,
                    type: "object",
                    desc: "A object that will be converted into a string"
                },
                {
                    name: "replacer",
                    req: false,
                    type: "callback,array",
                    desc: "if callback: a function that is run on each item in the object. if array: a whitelist of keys to allow in the final result",
                    params: [ //only if callback
                        {
                            name: "key",
                            req: false,
                            type: "object",//really just number or string
                            desc: "The key of the current JSON element"
                        },
                        {
                            name: "value",
                            req: false,
                            type: "object",
                            desc: "The value of the current JSON element"
                        },
                    ]
                },
                {
                    name: "space",
                    req: false,
                    type: "string,number",
                    desc: "Optional. Either a String or a Number. A string to be used as white space(max 10 characters), or a Number, from 0 to 10, to indicate how many space characters to use as white space."
                },
            ],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
    },
    Math: {
        E: {
            type: "property",
            desc: "turns Euler's number (approx. 2.718)",
            returns: {
                desc: "Euler's number (approx. 2.718)",
                name: "Euler's number",
                type: "number",
                over: false
            }
        },
        LN2: {
            type: "property",
            desc: "turns the natural logarithm of 2 (approx. 0.693)",
            returns: {
                desc: "A Number, representing the natural logarithm of 2",
                name: "LOG2",
                type: "number",
                over: false
            }
        },
        LN10: {
            type: "property",
            desc: "turns the natural logarithm of 10 (approx. 2.302)",
            returns: {
                desc: "A Number, representing the natural logarithm of 10",
                name: "LOG10",
                type: "number",
                over: false
            }
        },
        LOG2E: {
            type: "property",
            desc: "turns the base-2 logarithm of E (approx. 1.442)",
            returns: {
                desc: "A Number, representing the base-2 logarithm of E",
                name: "LOG2E",
                type: "number",
                over: false
            }
        },
        LOG10E: {
            type: "property",
            desc: "turns the base-10 logarithm of E (approx. 0.434)",
            returns: {
                desc: "	A Number, representing the base-10 logarithm of E",
                name: "LOG10E",
                type: "number",
                over: false
            }
        },
        PI: {
            type: "property",
            desc: "turns PI (approx. 3.14)",
            returns: {
                desc: "A Number, representing PI",
                name: "pi",
                type: "number",
                over: false
            }
        },
        SQRT1_2: {
            type: "property",
            desc: "turns the square root of 1/2 (approx. 0.707)",
            returns: {
                desc: "A Number, representing the square root of 1/2",
                name: "square root of 1/2",
                type: "number",
                over: false
            }
        },
        SQRT2: {
            type: "property",
            desc: "turns the square root of 2 (approx. 1.414)",
            returns: {
                desc: "A Number, representing the square root of 2",
                name: "square root of 2",
                type: "number",
                over: false
            }
        },
        abs: {
            type: "function",
            desc: "Returns the absolute value of x",
            params: [
                {
                    name: "number to abs",
                    req: true,
                    type: "number",
                    desc: "A number to compute the absolute value of"
                },
            ],
            returns: {
                desc: "	A Number, representing the absolute value of the specified number, or NaN if the value is not a number, or 0 if the value is null",
                name: "absolute number",
                type: "number",
                over: false
            },
        },
        acos: {
            type: "function",
            desc: "Returns the arccosine of x, in radians",
            params: [
                {
                    name: "number to acos",
                    req: true,
                    type: "number",
                    desc: "A number to compute the arccosine  value of"
                },
            ],
            returns: {
                desc: "A Number, from 0 to PI, or NaN if the value is outside the range of -1 to 1",
                name: "arccosine",
                type: "number",
                over: false
            },
        },
        acosh: {
            type: "function",
            desc: "Returns the hyperbolic arccosine of x",
            params: [
                {
                    name: "number to acosh",
                    req: true,
                    type: "number",
                    desc: "A number to compute the hyperbolic arccosine value of"
                },
            ],
            returns: {
                desc: "A Number, or NaN if the parameter is less than 1",
                name: "hyperbolic arccosine",
                type: "number",
                over: false
            },
        },
        asin: {
            type: "function",
            desc: "Returns the arcsine of x, in radians",
            params: [
                {
                    name: "number to arcsine",
                    req: true,
                    type: "number",
                    desc: "A number to compute the arcsine value of"
                },
            ],
            returns: {
                desc: "A Number, from -PI/2 to PI/2, or NaN if the value is outside the range of -1 to 1",
                name: "arcsine",
                type: "number",
                over: false
            },
        },
        asinh: {
            type: "function",
            desc: "Returns the hyperbolic arcsine of x",
            params: [
                {
                    name: "number to hyperbolic arcsine",
                    req: true,
                    type: "number",
                    desc: "A number to compute the hyperbolic arcsine value of"
                },
            ],
            returns: {
                desc: "A Number, representing the hyperbolic arcsine of the input value",
                name: "hyperbolic arcsine",
                type: "number",
                over: false
            },
        },
        atan: {
            type: "function",
            desc: "Returns the arctangent of x as a numeric value between -PI/2 and PI/2 radians",
            params: [
                {
                    name: "number to arctangent",
                    req: true,
                    type: "number",
                    desc: "A number to compute the arctangent value of"
                },
            ],
            returns: {
                desc: "A Number, representing the arctangent of the input value",
                name: "arctangent",
                type: "number",
                over: false
            },
        },
        atan2: {
            type: "function",
            desc: "Returns the arctangent of the quotient of its arguments",
            params: [
                {
                    name: "y number",
                    req: true,
                    type: "number",
                    desc: "A number representing the y coordinate"
                },
                {
                    name: "x number",
                    req: true,
                    type: "number",
                    desc: "A number representing the x coordinate"
                },
            ],
            returns: {
                desc: "A Number, from PI to -PI, or NaN if the value(s) are empty",
                name: "arctangent of the quotient",
                type: "number",
                over: false
            },
        },
        atanh: {
            type: "function",
            desc: "Returns the hyperbolic arctangent of x",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to compute"
                },
            ],
            returns: {
                desc: "A Number, or NaN, or Infinity, or -Infinity",
                name: "hyperbolic arctangent",
                type: "number",
                over: false
            },
        },
        cbrt: {
            type: "function",
            desc: "Returns the cubic root of x",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to compute"
                },
            ],
            returns: {
                desc: "The cube root",
                name: "cube root",
                type: "number",
                over: false
            },
        },
        ceil: {
            type: "function",
            desc: "Returns x, rounded upwards to the nearest integer",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to compute"
                },
            ],
            returns: {
                desc: "Rounded up to the nearest whole number",
                name: "rounded up",
                type: "number",
                over: false
            },
        },
        cos: {
            type: "function",
            desc: "Returns the cosine of x (x is in radians)",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to cosine"
                },
            ],
            returns: {
                desc: "A Number, from -1 to 1, representing the cosine of an angle, or NaN if the value is empty",
                name: "cosine",
                type: "number",
                over: false
            },
        },
        cosh: {
            type: "function",
            desc: "Returns the hyperbolic cosine of x",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to hyperbolic cosine"
                },
            ],
            returns: {
                desc: "The hyperbolic cosine of a number",
                name: "hyperbolic cosine",
                type: "number",
                over: false
            },
        },
        exp: {
            type: "function",
            desc: "Returns the value of Ex",
            params: [
                {
                    name: "x",
                    req: true,
                    type: "number",
                    desc: "A number to pass to euler function"
                },
            ],
            returns: {
                desc: "A Number, representing Ex",
                name: "euler number",
                type: "number",
                over: false
            },
        },
        floor: {
            type: "function",
            desc: "Returns x, rounded downwards to the nearest integer",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to hyperbolic cosine"
                },
            ],
            returns: {
                desc: "Rounded down to the nearest whole number",
                name: "rounded down",
                type: "number",
                over: false
            },
        },
        log: {
            type: "function",
            desc: "Returns the natural logarithm (base E) of x",
            params: [
                {
                    name: "number",
                    req: true,
                    type: "number",
                    desc: "A number to log"
                },
            ],
            returns: {
                desc: "A Number, representing the natural logarithm of a specified number",
                name: "log",
                type: "number",
                over: false
            },
        },
        max: {
            type: "function",
            desc: "Returns the number with the highest value",
            params: [
                {
                    name: "number",
                    repeat: true,
                    req: false, //return infinity with 0 params
                    type: "number",
                    desc: "A number to compute the max of"
                },
            ],
            returns: {
                desc: "the largest number in the parameters",
                name: "largest number",
                type: "number",
                over: false
            },
        },
        min: {
            type: "function",
            desc: "Returns the number with the lowest value",
            params: [
                {
                    name: "number",
                    repeat: true,
                    req: false, //return -infinity with 0 params
                    type: "number",
                    desc: "A number to compute the min of"
                },
            ],
            returns: {
                desc: "the smallest number in the parameters",
                name: "smallest number",
                type: "number",
                over: false
            },
        },
        pow: {
            type: "function",
            desc: "Returns the value of x to the power of y",
            params: [
                {
                    name: "base",
                    req: true,
                    type: "number",
                    desc: "A base number to power"
                },
                {
                    name: "exponent",
                    req: true,
                    type: "number",
                    desc: "A exponent to use"
                },
            ],
            returns: {
                desc: "A Number, representing the value of x to the power of y",
                name: "powered",
                type: "number",
                over: false
            },
        },
        random: {
            type: "function",
            desc: "Returns a random number between 0 and 1",
            params: [],
            returns: {
                desc: "A Number, representing a number from 0 up to but not including 1",
                name: "random",
                type: "number",
                over: false
            },
        },
        round: {
            type: "function",
            desc: "Rounds x to the nearest integer",
            params: [
                {
                    name: "number to be rounded",
                    req: true,
                    type: "number",
                    desc: "A number to be rounded"
                },
            ],
            returns: {
                desc: "Number rounded to the nearest interger",
                name: "rounded",
                type: "number",
                over: false
            },
        },
        sin: {
            type: "function",
            desc: "Returns the sine of x (x is in radians)",
            params: [
                {
                    name: "sine of",
                    req: true,
                    type: "number",
                    desc: "number to get sine of"
                },
            ],
            returns: {
                desc: "returns a value between -1 and 1, which represents the sine of the parameter x.",
                name: "sine",
                type: "number",
                over: false
            },
        },
        sinh: {
            type: "function",
            desc: "Returns the hyperbolic sine of x",
            params: [
                {
                    name: "hyperbolic sine of",
                    req: true,
                    type: "number",
                    desc: "number to get hyperbolic sine of"
                },
            ],
            returns: {
                desc: "returns a hyperbolic sine of a number",
                name: "hyperbolic sine",
                type: "number",
                over: false
            },
        },
        sqrt: {
            type: "function",
            desc: "Returns the square root of x",
            params: [
                {
                    name: "square root of",
                    req: true,
                    type: "number",
                    desc: "number to get square root of"
                },
            ],
            returns: {
                desc: "square root of a number",
                name: "square root",
                type: "number",
                over: false
            },
        },
        tan: {
            type: "function",
            desc: "Returns the tangent of an angle",
            params: [
                {
                    name: "tangent of",
                    req: true,
                    type: "number",
                    desc: "number to get tangent of "
                },
            ],
            returns: {
                desc: "tangent of a number",
                name: "tangent",
                type: "number",
                over: false
            },
        },
        tanh: {
            type: "function",
            desc: "Returns the hyperbolic tangent of a number",
            params: [
                {
                    name: "hyperbolic tangent of",
                    req: true,
                    type: "number",
                    desc: "number to get hyperbolic tangent of "
                },
            ],
            returns: {
                desc: "hyperbolic tangent of a number",
                name: "hyperbolic tangent",
                type: "number",
                over: false
            },
        },
        trunc: {
            type: "function",
            desc: "Returns the integer part of a number (x)",
            params: [
                {
                    name: "number to trim",
                    req: true,
                    type: "number",
                    desc: "number to trim the decimals off of"
                },
            ],
            returns: {
                desc: "interger of input trimmed",
                name: "interger",
                type: "number",
                over: false
            },
        },
    },
    Number: {
        constructor: {
            type: "function",
            desc: "turns the function that created JavaScript's Number prototype",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        MAX_VALUE: {
            type: "function",
            desc: "eturns the largest number possible in JavaScript",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        MIN_VALUE: {
            type: "function",
            desc: "Returns the smallest number possible in JavaScript",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        NEGATIVE_INFINITY: {
            type: "function",
            desc: "presents negative infinity (returned on overflow)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        NaN: {
            type: "function",
            desc: "presents a Not-a-Number value",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        POSITIVE_INFINITY: {
            type: "function",
            desc: "presents infinity (returned on overflow)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "prototype": {
            type: "function",
            desc: "lows you to add properties and methods to an object",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        //funcs	
        isFinite: {
            type: "function",
            desc: "Checks whether a value is a finite number",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        isInteger: {
            type: "function",
            desc: "Checks whether a value is an integer",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        isNaN: {
            type: "function",
            desc: "Checks whether a value is Number.NaN",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        isSafeInteger: {
            type: "function",
            desc: "Checks whether a value is a safe integer",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toExponential: {
            type: "function",
            desc: "Converts a number into an exponential notation",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toFixed: {
            type: "function",
            desc: "Formats a number with x numbers of digits after the decimal point",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toLocaleString: {
            type: "function",
            desc: "Converts a number into a string, based on the locale settings",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toPrecision: {
            type: "function",
            desc: "Formats a number to x length",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toString: {
            type: "function",
            desc: "Converts a number to a string",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        valueOf: {
            type: "function",
            desc: "Returns the primitive value of a number",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
    },
    RegExp: {
        //Modifiers
        "g": {
            type: "modifier",
            desc: "rform a global match (find all matches rather than stopping after the first match)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "i": {
            type: "modifier",
            desc: "rform case-insensitive matching",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "m": {
            type: "modifier",
            desc: "rform multiline matching",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        //Brackets
        '[abc]': {
            type: "brackets",
            desc: "Find any character between the brackets",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '[^abc]': {
            type: "brackets",
            desc: "Find any character NOT between the brackets",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '[0-9]': {
            type: "brackets",
            desc: "Find any character between the brackets (any digit)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '[^0-9]': {
            type: "brackets",
            desc: "Find any character NOT between the brackets (any non-digit)",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '(x|y)': {
            type: "brackets",
            desc: "Find any of the alternatives specified",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        //Metacharacters
        '.': {
            type: "metacharacters",
            desc: "Find a single character, except newline or line terminator",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\w': {
            type: "metacharacters",
            desc: "Find a word character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\W': {
            type: "metacharacters",
            desc: "Find a non-word character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\d': {
            type: "metacharacters",
            desc: "Find a digit",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\D': {
            type: "metacharacters",
            desc: "Find a non-digit character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\s': {
            type: "metacharacters",
            desc: "Find a whitespace character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\S': {
            type: "metacharacters",
            desc: "Find a non-whitespace character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\b': {
            type: "metacharacters",
            desc: "Find a match at the beginning/end of a word, beginning like this: \bHI, end like this: HI\b",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\B': {
            type: "metacharacters",
            desc: "Find a match, but not at the beginning/end of a word",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\0': {
            type: "metacharacters",
            desc: "Find a NUL character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\n': {
            type: "metacharacters",
            desc: "Find a new line character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\f': {
            type: "metacharacters",
            desc: "Find a form feed character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\r': {
            type: "metacharacters",
            desc: "Find a carriage return character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\t': {
            type: "metacharacters",
            desc: "Find a tab character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\v': {
            type: "metacharacters",
            desc: "Find a vertical tab character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "\-xxx": {
            type: "metacharacters",
            desc: "Find the character specified by an octal number xxx",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\xdd': {
            type: "metacharacters",
            desc: "Find the character specified by a hexadecimal number dd",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '\udddd': {
            type: "metacharacters",
            desc: "Find the Unicode character specified by a hexadecimal number dddd",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        //Quantifiers
        'n+': {
            type: "quantifier",
            desc: "Matches any string that contains at least one n",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        'n*': {
            type: "quantifier",
            desc: "Matches any string that contains zero or more occurrences of n",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        'n?': {
            type: "quantifier",
            desc: "Matches any string that contains zero or one occurrences of n",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        'n{X}': {
            type: "quantifier",
            desc: "Matches any string that contains a sequence of X n's",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        'n{X,Y}': {
            type: "quantifier",
            desc: "Matches any string that contains a sequence of X to Y n's",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        'n{X,}': {
            type: "quantifier",
            desc: "Matches any string that contains a sequence of at least X n's",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        'n$': {
            type: "quantifier",
            desc: "Matches any string with n at the end of it",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '^n': {
            type: "quantifier",
            desc: "Matches any string with n at the beginning of it",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '?=n': {
            type: "quantifier",
            desc: "Matches any string that is followed by a specific string n",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        '?!n': {
            type: "quantifier",
            desc: "Matches any string that is not followed by a specific string n",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        //Properties
        constructor: {
            type: "function",
            desc: "Returns the function that created the RegExp object's prototype",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        global: {
            type: "property",
            desc: "Checks whether the 'g' modifier is set",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

        ignoreCase: {
            type: "property",
            desc: "Checks whether the 'i' modifier is set",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
        lastIndex: {
            type: "property",
            desc: "Specifiy the index at which to start the next match",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
        multiline: {
            type: "property",
            desc: "Checks whether the 'm' modifier is set",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
        source: {
            type: "property",
            desc: "Returns the text of the RegExp pattern",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
        //Methods
        exec: {
            type: "function",
            desc: "Tests for a match in a string. Returns the first match",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
        test: {
            type: "function",
            desc: "Tests for a match in a string. Returns true or false",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
        toString: {
            type: "function",
            desc: "Returns the string value of the regular expression",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "number",
                over: false
            },
        },
    },
    Statements: {
        "const": {
            type: "modifier",
            desc: "Declares a variable with a constant value",
            rules: {
                children: false,
                parenttype: ['structure'],
            },
            params: [
                {
                    name: "name",
                    req: true,
                    type: "string",
                    desc: "name of variable",
                },
                {
                    name: "value",
                    req: true,
                    type: "object",
                    desc: "value of variable"
                },
            ],
            returns: {
                desc: "The value of the variable",
                name: "value",
                type: "object",
                over: false
            }
        },
        "let": {
            type: "modifier",
            desc: "Declares a variable inside brackets {} scope",
            params: [
                {
                    name: "name",
                    req: true,
                    type: "string",
                    desc: "name of variable",
                },
                {
                    name: "value",
                    req: false,
                    type: "object",
                    desc: "value of variable"
                },
            ],
            returns: {
                desc: "The value of the variable",
                name: "value",
                type: "object",
                over: false
            }
        },
        "var": {
            type: "modifier",
            desc: "Declares a variable",
            params: [
                {
                    name: "name",
                    req: true,
                    type: "string",
                    desc: "name of variable",
                },
                {
                    name: "value",
                    req: false,
                    type: "object",
                    desc: "value of variable"
                },
            ],
            returns: {
                desc: "The value of the variable",
                name: "value",
                type: "object",
                over: false
            }
        },

        "function": {
            type: "structure",
            desc: "Declares a function",
            params: [
                {
                    name: "parameter",
                    req: false,
                    type: "object",
                    desc: "a function input parameter",
                    repeat: true,
                },
            ],
            returns: {
                desc: "what ever the function returns",
                name: "return value",
                type: "object",
                over: false
            }
        },
        "return": {
            type: "directive",
            desc: "Stops the execution of a function and returns a value from that function",
            rules: {
                children: false,
            },
            params: [
                {
                    name: "object to return",
                    req: true,
                    type: "object",
                    desc: "object to return",
                },
            ],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

        "if": {
            type: "structure",
            desc: "Marks a block of statements to be executed depending on a condition",
            params: [
                {
                    name: "evaluation",
                    req: true,
                    type: "boolean",
                    desc: "Defines the condition to enter the block"
                },
            ],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "if-else": {
            type: "structure",
            desc: "Marks a block of statements to be executed depending on a condition if the first condition fails",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "else": {
            type: "structure",
            desc: "Marks a block of statements to be executed if all prior if and if else conditions fail",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

        "do-while": {
            type: "loop",
            desc: "Executes a block of statements and repeats the block while a condition is true",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "for": {
            type: "loop",
            desc: "rough a block of code a number of times",
            paramdelim: ";",
            params: [
                {
                    name: "initialize",
                    req: false,
                    type: "variable",
                    desc: "name of variable",
                    repeat: true,
                },
                {
                    name: "evaluation",
                    req: true,
                    type: "boolean",
                    desc: "Defines the condition for running the loop (the code block). Normally this statement is used to evaluate the condition of the counter variable. If it returns true, the loop will start over again, if it returns false, the loop will end."
                },
                {
                    name: "execute",
                    req: false,
                    type: "simplestructure",
                    desc: "Executed each time after the loop (the code block) has been executed. Normally this statement is used to increment or decrement the counter variable."
                },
            ],
        },
        "for-in": {
            type: "loop",
            desc: "Loops through the properties of an object",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "for-of": {
            type: "loop",
            desc: "Loops through the values of an iterable object",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "while": {
            type: "loop",
            desc: "Marks a block of statements to be executed while a condition is true",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

        "switch": {
            type: "structure",
            desc: "Marks a block of statements to be executed depending on different cases",
            rules: {
                children: ["case", "default"],
            },
            params: [
                {
                    name: "compare case against",
                    req: true,
                    type: "object",
                    desc: "object to compare case against",
                },
            ],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "case": {
            type: "structure",
            desc: "A block of code to be executed when the case is a match",
            rules: {
                parent: ["switch"],
            },
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

        "break": {
            type: "directive",
            desc: "Exits a switch or a loop",
            rules: {
                children: false,
                parenttype: ['loop'],
                parent: ['switch'],
            },
        },
        "continue": {
            type: "directive",
            desc: "Breaks one iteration (in the loop) if a specified condition occurs, and continues with the next iteration in the loop",
            rules: {
                children: false,
                parenttype: ['loop', 'structure']
            },
        },

        "delete": {
            type: "directive",
            desc: "The delete keyword deletes both the value of the property and the property itself.",
            rules: {
                children: false,
                parenttype: ['loop', 'structure']
            },
        },


        "debugger": {
            type: "error",
            desc: "ops the execution of JavaScript, and calls (if available) the debugging function",
            rules: {
                children: false,
                parent: true,
            },
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

        "try": {
            type: "error",
            desc: "	Marks the block of statements to be executed when an error occurs in a try block, and implements error handling",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "catch": {
            type: "error",
            desc: "	Marks the block of statements to be executed when an error occurs in a try block, and implements error handling",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "finally": {
            type: "error",
            desc: "	Marks the block of statements to be executed when an error occurs in a try block, and implements error handling",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        "throw": {
            type: "error",
            desc: "rows (generates) an error",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },

    },
    String: {
        constructor: {
            type: "function",
            desc: "Returns the string's constructor function",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        length: {
            type: "function",
            desc: "Returns the length of a string",
            returns: {
                desc: "the number of chars in the string",
                name: "length",
                type: "number",
                over: false
            }
        },
        "prototype": {
            type: "function",
            desc: "Allows you to add properties and methods to an object",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        charAt: {
            type: "function",
            desc: "Returns the character at the specified index (position)",
            params: [
                {
                    name: "at index",
                    req: true,
                    type: "number",
                    desc: "the location of the character to return"
                }
            ],
            returns: {
                desc: "A String, representing the character at the specified index, or an empty string if the index number is not found",
                name: "found char",
                type: "string",
                over: false
            }
        },
        charCodeAt: {
            type: "function",
            desc: "Returns the Unicode of the character at the specified index",
            params: [
                {
                    name: "at index",
                    req: true,
                    type: "number",
                    desc: "the location of the character to return"
                }
            ],
            returns: {
                desc: "This method returns 'NaN' if there is no character at the specified index, or if the index is less than '0'.",
                name: "found chars unicode number",
                type: "number",
                over: false
            }
        },
        concat: {
            type: "function",
            desc: "Joins two or more strings, and returns a new joined strings",
            params:
                [
                    {
                        name: "string2",
                        req: 1,
                        type: "string",
                        desc: "The string(s) to be joined",
                        repeat: true
                    }
                ],
            returns: {
                desc: "A new String, containing the text of the combined strings",
                type: "array",
                over: false
            }
        },
        endsWith: {
            type: "function",
            desc: "Checks whether a string ends with specified string/characters",
            params:
                [
                    {
                        name: "end string",
                        req: true,
                        type: "string",
                        desc: "The string that needs to be at the end to return true",
                    },
                    {
                        name: "length to search",
                        req: false,
                        type: "number",
                        desc: "Specify the length of the string to search. If omitted, the default value is the length of the string",
                    }
                ],
            returns: {
                desc: "Returns true if the string ends with the value, otherwise it returns false",
                type: "boolean",
                over: false
            }
        },
        fromCharCode: {
            type: "function",
            desc: "Converts Unicode values to characters",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        includes: {
            type: "function",
            desc: "Checks whether a string contains the specified string/characters",
            params:
                [
                    {
                        name: "search string",
                        req: true,
                        type: "string",
                        desc: "The string that needs to be present to return true",
                    },
                    {
                        name: "start search",
                        req: false,
                        type: "number",
                        desc: "Specify at which character in the string to start searching",
                    }
                ],
            returns: {
                desc: "Returns true if the string includes the value, otherwise it returns false",
                type: "boolean",
                over: false
            }
        },
        indexOf: {
            type: "function",
            desc: "Returns the position of the first found occurrence of a specified value in a string",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        lastIndexOf: {
            type: "function",
            desc: "Returns the position of the last found occurrence of a specified value in a string",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        localeCompare: {
            type: "function",
            desc: "Compares two strings in the current locale",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        match: {
            type: "function",
            desc: "Searches a string for a match against a regular expression, and returns the matches",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        repeat: {
            type: "function",
            desc: "Returns a new string with a specified number of copies of an existing string",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        replace: {
            type: "function",
            desc: "Searches a string for a specified value, or a regular expression, and returns a new string where the specified values are replaced",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        search: {
            type: "function",
            desc: "Searches a string for a specified value, or regular expression, and returns the position of the match",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        slice: {
            type: "function",
            desc: "Extracts a part of a string and returns a new string",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        split: {
            type: "function",
            desc: "Splits a string into an array of substrings",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        startsWith: {
            type: "function",
            desc: "Checks whether a string begins with specified characters",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        substr: {
            type: "function",
            desc: "Extracts the characters from a string, beginning at a specified start position, and through the specified number of character",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        substring: {
            type: "function",
            desc: "Extracts the characters from a string, between two specified indices",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toLocaleLowerCase: {
            type: "function",
            desc: "Converts a string to lowercase letters, according to the host's locale",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toLocaleUpperCase: {
            type: "function",
            desc: "Converts a string to uppercase letters, according to the host's locale",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toLowerCase: {
            type: "function",
            desc: "Converts a string to lowercase letters",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toString: {
            type: "function",
            desc: "Returns the value of a String object",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        toUpperCase: {
            type: "function",
            desc: "Converts a string to uppercase letters",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        trim: {
            type: "function",
            desc: "Removes whitespace from both ends of a string",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
        valueOf: {
            type: "function",
            desc: "Returns the primitive value of a String object",
            params: [],
            returns: {
                desc: "",
                name: "",
                type: "object",
                over: false
            }
        },
    },
    //DOM
    Attribute: {
        name: {
            type: "property",
            desc: "Returns the name of an attribute",
            returns: {
                desc: "The name of the attribute",
                name: "attribute name",
                type: "string,number", //a key will be a number of string
                over: false
            }
        },
        value: {
            type: "property",
            desc: "Sets or returns the value of the attribute",
            params: [
                {
                    name: "new attribute value",
                    req: false,
                    type: "object",
                    desc: "The new value for the attribute",
                }
            ],
            returns: {
                desc: "The value of the attribute",
                name: "attribute value",
                type: "object", //a key will be a number of string
                over: false
            }
        },
        specified: {
            type: "property",
            desc: "Returns true if the attribute has been specified, otherwise it returns false",
            returns: {
                desc: "If the property is specified",
                name: "property specified",
                type: "boolean",
                over: false
            }
        }
    },
    Nodemap: {
        //a nodemap is an elements list of attributes.
        length: {
            desc: "Returns the number of attribute nodes in a NamedNodeMap",
            type: "property",
        },
        getNamedItem: {
            type: "function",
            desc: "Returns a specified attribute node from a NamedNodeMap",
            params: [
                {
                    name: "node name",
                    req: false,
                    type: "string",
                    desc: "A Node object, representing the attribute node with the specified name",
                },
            ],
            returns: {
                desc: "Required. The name of the node in the namedNodeMap you want to return",
                name: "property specified",
                type: "string",
                over: false
            }
        },
        item: {
            type: "function",
            desc: "Returns the attribute node at a specified index in a NamedNodeMap",
            params: [
                {
                    name: "attribute index",
                    req: false,
                    type: "number",
                    desc: "The index of the attribute to get",
                },
            ],
            returns: {
                desc: "the attribute at the index supplied",
                name: "attribute",
                type: "attribute",
                over: false
            }
        },
        removeNamedItem: {
            type: "function",
            desc: "Removes a specified attribute node",
            params: [
                {
                    name: "remove name",
                    req: false,
                    type: "string",
                    desc: "The name of the attribute to remove from the Nodemap",
                },
            ],
            returns: {
                desc: "A Node object, representing the removed attribute node",
                name: "property specified",
                type: "attribute",
                over: false
            }
        },
        setNamedItem: {
            type: "function",
            desc: "Sets the specified attribute ",
            params: [
                {
                    name: "add attribute",
                    req: true,
                    type: "attribute",
                    desc: "The node you want to add/replace in the NamedNodeMap collection"
                }
            ],
            returns: {
                desc: "A Node object, representing the replaced node (if any), otherwise null",
                name: "property overwritten or null",
                type: "attribute,null",
                over: false
            }
        }
    },
    Element: {
        accessKey: {
            type: "property",
            desc: "The accesskey attribute specifies a shortcut key to activate/focus an element.",
            paramdelim: " ",
            params: [
                {
                    name: "shortcut character",
                    req: 1,
                    type: "character",
                    desc: "Specifies the shortcut key to activate/focus the element",
                    repeat: true
                }
            ],
            returns: {
                desc: "The access keys that the element currently has assigned",
                name: "access keys",
                type: "string",
                over: false
            }

        },
        attributes: {
            type: "property",
            desc: "The attributes property returns a collection of the specified node's attributes, as a NamedNodeMap object.",
            returns: {
                desc: "The nodemap for this element",
                name: "attributes",
                type: "nodemap",
                over: false
            }
        },
        childElementCount: {
            type: "property",
            desc: "Returns the number of child elements an element has",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        childNodes: {
            type: "property",
            desc: "Returns a collection of an element's child nodes (including text and comment nodes)",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        children: {
            type: "property",
            desc: "Returns a collection of an element's child element (excluding text and comment nodes)",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        classList: {
            type: "property",
            desc: "Returns the class name(s) of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        className: {
            type: "property",
            desc: "Sets or returns the value of the class attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        clientHeight: {
            type: "property",
            desc: "Returns the height of an element, including padding",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        clientLeft: {
            type: "property",
            desc: "Returns the width of the left border of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        clientTop: {
            type: "property",
            desc: "Returns the width of the top border of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        clientWidth: {
            type: "property",
            desc: "Returns the width of an element, including padding",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        contentEditable: {
            type: "property",
            desc: "Sets or returns whether the content of an element is editable or not",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dir: {
            type: "property",
            desc: "Sets or returns the value of the dir attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        firstChild: {
            type: "property",
            desc: "Returns the first child node of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        firstElementChild: {
            type: "property",
            desc: "Returns the first child element of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        id: {
            type: "property",
            desc: "Sets or returns the value of the id attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        innerHTML: {
            type: "property",
            desc: "Sets or returns the content of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        innerText: {
            type: "property",
            desc: "Sets or returns the text content of a node and its descendants",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        isContentEditable: {
            type: "property",
            desc: "Returns true if the content of an element is editable, otherwise false",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        lang: {
            type: "property",
            desc: "Sets or returns the value of the lang attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        lastChild: {
            type: "property",
            desc: "Returns the last child node of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        lastElementChild: {
            type: "property",
            desc: "Returns the last child element of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        namespaceURI: {
            type: "property",
            desc: "Returns the namespace URI of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        nextSibling: {
            type: "property",
            desc: "Returns the next node at the same node tree level",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        nextElementSibling: {
            type: "property",
            desc: "Returns the next element at the same node tree level",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        nodeName: {
            type: "property",
            desc: "Returns the name of a node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        nodeType: {
            type: "property",
            desc: "Returns the node type of a node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        nodeValue: {
            type: "property",
            desc: "Sets or returns the value of a node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        offsetHeight: {
            type: "property",
            desc: "Returns the height of an element, including padding, border and scrollbar",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        offsetWidth: {
            type: "property",
            desc: "Returns the width of an element, including padding, border and scrollbar",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        offsetLeft: {
            type: "property",
            desc: "Returns the horizontal offset position of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        offsetParent: {
            type: "property",
            desc: "Returns the offset container of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        offsetTop: {
            type: "property",
            desc: "Returns the vertical offset position of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        ownerDocument: {
            type: "property",
            desc: "Returns the root element (document object) for an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        parentNode: {
            type: "property",
            desc: "Returns the parent node of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        parentElement: {
            type: "property",
            desc: "Returns the parent element node of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        previousSibling: {
            type: "property",
            desc: "Returns the previous node at the same node tree level",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        previousElementSibling: {
            type: "property",
            desc: "Returns the previous element at the same node tree level",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scrollHeight: {
            type: "property",
            desc: "Returns the entire height of an element, including padding",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scrollLeft: {
            type: "property",
            desc: "Sets or returns the number of pixels an element's content is scrolled horizontally",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scrollTop: {
            type: "property",
            desc: "Sets or returns the number of pixels an element's content is scrolled vertically",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scrollWidth: {
            type: "property",
            desc: "Returns the entire width of an element, including padding",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        style: {
            type: "property",
            desc: "Sets or returns the value of the style attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        tabIndex: {
            type: "property",
            desc: "Sets or returns the value of the tabindex attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        tagName: {
            type: "property",
            desc: "Returns the tag name of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        textContent: {
            type: "property",
            desc: "Sets or returns the textual content of a node and its descendants",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        title: {
            type: "property",
            desc: "Sets or returns the value of the title attribute of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        addEventListener: {
            type: "function",
            desc: "Attaches an event handler to the specified element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        appendChild: {
            type: "function",
            desc: "Adds a new child node, to an element, as the last child node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        blur: {
            type: "function",
            desc: "Removes focus from an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        click: {
            type: "function",
            desc: "Simulates a mouse-click on an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        cloneNode: {
            type: "function",
            desc: "Clones an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        compareDocumentPosition: {
            type: "function",
            desc: "Compares the document position of two elements",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        contains: {
            type: "function",
            desc: "Returns true if a node is a descendant of a node, otherwise false",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        exitFullscreen: {
            type: "function",
            desc: "Cancels an element in fullscreen mode",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        focus: {
            type: "function",
            desc: "Gives focus to an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        getAttribute: {
            type: "function",
            desc: "Returns the specified attribute value of an element node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        getAttributeNode: {
            type: "function",
            desc: "Returns the specified attribute node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        getBoundingClientRect: {
            type: "function",
            desc: "Returns the size of an element and its position relative to the viewport",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        getElementsByClassName: {
            type: "function",
            desc: "Returns a collection of all child elements with the specified class name",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        getElementsByTagName: {
            type: "function",
            desc: "Returns a collection of all child elements with the specified tag name",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        hasAttribute: {
            type: "function",
            desc: "Returns true if an element has the specified attribute, otherwise false",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        hasAttributes: {
            type: "function",
            desc: "Returns true if an element has any attributes, otherwise false",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        hasChildNodes: {
            type: "function",
            desc: "Returns true if an element has any child nodes, otherwise false",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        insertAdjacentElement: {
            type: "function",
            desc: "Inserts a HTML element at the specified position relative to the current element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        insertAdjacentHTML: {
            type: "function",
            desc: "Inserts a HTML formatted text at the specified position relative to the current element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        insertAdjacentText: {
            type: "function",
            desc: "Inserts text into the specified position relative to the current element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        insertBefore: {
            type: "function",
            desc: "Inserts a new child node before a specified, existing, child node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        isDefaultNamespace: {
            type: "function",
            desc: "Returns true if a specified namespaceURI is the default, otherwise false",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        isEqualNode: {
            type: "function",
            desc: "Checks if two elements are equal",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        isSameNode: {
            type: "function",
            desc: "Checks if two elements are the same node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        isSupported: {
            type: "function",
            desc: "Returns true if a specified feature is supported on the element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        normalize: {
            type: "function",
            desc: "Joins adjacent text nodes and removes empty text nodes in an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        querySelector: {
            type: "function",
            desc: "Returns the first child element that matches a specified CSS selector(s) of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        querySelectorAll: {
            type: "function",
            desc: "Returns all child elements that matches a specified CSS selector(s) of an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        removeAttribute: {
            type: "function",
            desc: "Removes a specified attribute from an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        removeAttributeNode: {
            type: "function",
            desc: "Removes a specified attribute node, and returns the removed node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        removeChild: {
            type: "function",
            desc: "Removes a child node from an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        removeEventListener: {
            type: "function",
            desc: "Removes an event handler that has been attached with the addEventListener method",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        replaceChild: {
            type: "function",
            desc: "Replaces a child node in an element",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        requestFullscreen: {
            type: "function",
            desc: "Shows an element in fullscreen mode",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scrollIntoView: {
            type: "function",
            desc: "Scrolls the specified element into the visible area of the browser window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        setAttribute: {
            type: "function",
            desc: "Sets or changes the specified attribute, to the specified value",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        setAttributeNode: {
            type: "function",
            desc: "Sets or changes the specified attribute node",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        toString: {
            type: "function",
            desc: "Converts an element to a string",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        }
    },
    Event: {
        abort: {
            type: "event",
            desc: "The event occurs when the loading of a media is aborted	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        afterprint: {
            type: "event",
            desc: "The event occurs when a page has started printing, or if the print dialogue box has been closed	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        animationend: {
            type: "event",
            desc: "The event occurs when a CSS animation has completed	AnimationEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        animationiteration: {
            type: "event",
            desc: "The event occurs when a CSS animation is repeated	AnimationEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        animationstart: {
            type: "event",
            desc: "The event occurs when a CSS animation has started	AnimationEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        beforeprint: {
            type: "event",
            desc: "The event occurs when a page is about to be printed	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        beforeunload: {
            type: "event",
            desc: "The event occurs before the document is about to be unloaded	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        blur: {
            type: "event",
            desc: "The event occurs when an element loses focus	FocusEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        canplay: {
            type: "event",
            desc: "The event occurs when the browser can start playing the media (when it has buffered enough to begin)	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        canplaythrough: {
            type: "event",
            desc: "The event occurs when the browser can play through the media without stopping for buffering	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        change: {
            type: "event",
            desc: "The event occurs when the content of a form element, the selection, or the checked state have changed (for <input>, <select>, and <textarea>)	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        click: {
            type: "event",
            desc: "The event occurs when the user clicks on an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        contextmenu: {
            type: "event",
            desc: "The event occurs when the user right-clicks on an element to open a context menu	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        copy: {
            type: "event",
            desc: "The event occurs when the user copies the content of an element	ClipboardEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        cut: {
            type: "event",
            desc: "The event occurs when the user cuts the content of an element	ClipboardEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dblclick: {
            type: "event",
            desc: "The event occurs when the user double-clicks on an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        drag: {
            type: "event",
            desc: "The event occurs when an element is being dragged	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dragend: {
            type: "event",
            desc: "The event occurs when the user has finished dragging an element	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dragenter: {
            type: "event",
            desc: "The event occurs when the dragged element enters the drop target	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dragleave: {
            type: "event",
            desc: "The event occurs when the dragged element leaves the drop target	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dragover: {
            type: "event",
            desc: "The event occurs when the dragged element is over the drop target	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        dragstart: {
            type: "event",
            desc: "The event occurs when the user starts to drag an element	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        drop: {
            type: "event",
            desc: "The event occurs when the dragged element is dropped on the drop target	DragEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        durationchange: {
            type: "event",
            desc: "The event occurs when the duration of the media is changed	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        ended: {
            type: "event",
            desc: "The event occurs when the media has reach the end (useful for messages like 'thanks for listening')	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        error: {
            type: "event",
            desc: "The event occurs when an error occurs while loading an external file	ProgressEvent, UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        focus: {
            type: "event",
            desc: "The event occurs when an element gets focus	FocusEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        focusin: {
            type: "event",
            desc: "The event occurs when an element is about to get focus	FocusEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        focusout: {
            type: "event",
            desc: "The event occurs when an element is about to lose focus	FocusEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        fullscreenchange: {
            type: "event",
            desc: "The event occurs when an element is displayed in fullscreen mode	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        fullscreenerror: {
            type: "event",
            desc: "The event occurs when an element can not be displayed in fullscreen mode	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        hashchange: {
            type: "event",
            desc: "The event occurs when there has been changes to the anchor part of a URL	HashChangeEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        input: {
            type: "event",
            desc: "The event occurs when an element gets user input	InputEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        invalid: {
            type: "event",
            desc: "The event occurs when an element is invalid	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        keydown: {
            type: "event",
            desc: "The event occurs when the user is pressing a key	KeyboardEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        keypress: {
            type: "event",
            desc: "The event occurs when the user presses a key	KeyboardEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        keyup: {
            type: "event",
            desc: "The event occurs when the user releases a key	KeyboardEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        load: {
            type: "event",
            desc: "The event occurs when an object has loaded	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        loadeddata: {
            type: "event",
            desc: "The event occurs when media data is loaded	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        loadedmetadata: {
            type: "event",
            desc: "The event occurs when meta data (like dimensions and duration) are loaded	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        loadstart: {
            type: "event",
            desc: "The event occurs when the browser starts looking for the specified media	ProgressEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        message: {
            type: "event",
            desc: "The event occurs when a message is received through the event source	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mousedown: {
            type: "event",
            desc: "The event occurs when the user presses a mouse button over an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mouseenter: {
            type: "event",
            desc: "The event occurs when the pointer is moved onto an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mouseleave: {
            type: "event",
            desc: "The event occurs when the pointer is moved out of an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mousemove: {
            type: "event",
            desc: "The event occurs when the pointer is moving while it is over an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mouseover: {
            type: "event",
            desc: "The event occurs when the pointer is moved onto an element, or onto one of its children	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mouseout: {
            type: "event",
            desc: "The event occurs when a user moves the mouse pointer out of an element, or out of one of its children	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mouseup: {
            type: "event",
            desc: "The event occurs when a user releases a mouse button over an element	MouseEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        mousewheel: {
            type: "event",
            desc: "Deprecated. Use the wheel event instead	WheelEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        offline: {
            type: "event",
            desc: "The event occurs when the browser starts to work offline	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        online: {
            type: "event",
            desc: "The event occurs when the browser starts to work online	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        open: {
            type: "event",
            desc: "The event occurs when a connection with the event source is opened	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        pagehide: {
            type: "event",
            desc: "The event occurs when the user navigates away from a webpage	PageTransitionEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        pageshow: {
            type: "event",
            desc: "The event occurs when the user navigates to a webpage	PageTransitionEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        paste: {
            type: "event",
            desc: "The event occurs when the user pastes some content in an element	ClipboardEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        pause: {
            type: "event",
            desc: "The event occurs when the media is paused either by the user or programmatically	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        play: {
            type: "event",
            desc: "The event occurs when the media has been started or is no longer paused	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        playing: {
            type: "event",
            desc: "The event occurs when the media is playing after having been paused or stopped for buffering	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        popstate: {
            type: "event",
            desc: "The event occurs when the window's history changes	PopStateEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        progress: {
            type: "event",
            desc: "The event occurs when the browser is in the process of getting the media data (downloading the media)	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        ratechange: {
            type: "event",
            desc: "The event occurs when the playing speed of the media is changed	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        resize: {
            type: "event",
            desc: "The event occurs when the document view is resized	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        reset: {
            type: "event",
            desc: "The event occurs when a form is reset	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scroll: {
            type: "event",
            desc: "The event occurs when an element's scrollbar is being scrolled	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        search: {
            type: "event",
            desc: "The event occurs when the user writes something in a search field (for <input='search'>)	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        seeked: {
            type: "event",
            desc: "The event occurs when the user is finished moving/skipping to a new position in the media	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        seeking: {
            type: "event",
            desc: "The event occurs when the user starts moving/skipping to a new position in the media	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        select: {
            type: "event",
            desc: "The event occurs after the user selects some text (for <input> and <textarea>)	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        show: {
            type: "event",
            desc: "The event occurs when a <menu> element is shown as a context menu	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        stalled: {
            type: "event",
            desc: "The event occurs when the browser is trying to get media data, but data is not available	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        storage: {
            type: "event",
            desc: "The event occurs when a Web Storage area is updated	StorageEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        submit: {
            type: "event",
            desc: "The event occurs when a form is submitted	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        suspend: {
            type: "event",
            desc: "The event occurs when the browser is intentionally not getting media data	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        timeupdate: {
            type: "event",
            desc: "The event occurs when the playing position has changed (like when the user fast forwards to a different point in the media)	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        toggle: {
            type: "event",
            desc: "The event occurs when the user opens or closes the <details> element	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        touchcancel: {
            type: "event",
            desc: "The event occurs when the touch is interrupted	TouchEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        touchend: {
            type: "event",
            desc: "The event occurs when a finger is removed from a touch screen	TouchEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        touchmove: {
            type: "event",
            desc: "The event occurs when a finger is dragged across the screen	TouchEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        touchstart: {
            type: "event",
            desc: "The event occurs when a finger is placed on a touch screen	TouchEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        transitionend: {
            type: "event",
            desc: "The event occurs when a CSS transition has completed	TransitionEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        unload: {
            type: "event",
            desc: "The event occurs once a page has unloaded (for <body>)	UiEvent, Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        volumechange: {
            type: "event",
            desc: "The event occurs when the volume of the media has changed (includes setting the volume to 'mute')	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        waiting: {
            type: "event",
            desc: "The event occurs when the media has paused but is expected to resume (like when the media pauses to buffer more data)	Event",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        wheel: {
            type: "event",
            desc: "The event occurs when the mouse wheel rolls up or down over an element	WheelEvent",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        }
    },
    HTMLCollection: {
        length: {
            type: "property",
            desc: "Returns the number of elements in an HTMLCollection",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        item: {
            type: "function",
            desc: "Returns the element at the specified index in an HTMLCollection:",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        namedItem: {
            type: "function",
            desc: "Returns the element with the specified ID, or name, in an HTMLCollection",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        }
    },
    Window: {
        closed: {
            type: "property",
            desc: "Returns a Boolean value indicating whether a window has been closed or not",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        console: {
            type: "object",
            desc: "Returns a reference to the Console object, which provides methods for logging information to the browser's console (See Console object)",
            assert: {
                type: "function",
                desc: "Writes an error message to the console if the assertion is false",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            clear: {
                type: "function",
                desc: "Clears the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            count: {
                type: "function",
                desc: "Logs the number of times that this particular call to count() has been called",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            error: {
                type: "function",
                desc: "Outputs an error message to the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            group: {
                type: "function",
                desc: "Creates a new inline group in the console. This indents following console messages by an additional level, until console.groupEnd() is called",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            groupCollapsed: {
                type: "function",
                desc: "Creates a new inline group in the console. However, the new group is created collapsed. The user will need to use the disclosure button to expand it",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            groupEnd: {
                type: "function",
                desc: "Exits the current inline group in the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            info: {
                type: "function",
                desc: "Outputs an informational message to the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            log: {
                type: "function",
                desc: "Outputs a message to the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            table: {
                type: "function",
                desc: "Displays tabular data as a table",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            time: {
                type: "function",
                desc: "Starts a timer (can track how long an operation takes)",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            timeEnd: {
                type: "function",
                desc: "Stops a timer that was previously started by console.time()",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            trace: {
                type: "function",
                desc: "Outputs a stack trace to the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            warn: {
                type: "function",
                desc: "Outputs a warning message to the console",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
	    defaultStatus: {
            type: "property",
            desc: "Sets or returns the default text in the statusbar of a window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        document: {
            type: "object",
            desc: "Returns the Document object for the window (See Document object)",
            activeElement: {
                type: "property",
                desc: "Returns the currently focused element in the document",
                returns: {
                    desc: "A reference to the element object in the document that has focus",
                    name: "selected element",
                    type: "element",
                    over: false
                }
            },
            anchors: {
                type: "property",
                desc: "Returns a collection of all <a> elements in the document that have a name attribute",
                returns: {
                    desc: "An HTMLCollection Object, representing all <a> elements in the document that have a name attribute. The elements in the collection are sorted as they appear in the source code",
                    name: "",
                    type: "HTMLCollection",
                    over: false
                }
            },
            applets: {
                type: "property",
                desc: "Returns a collection of all <applet> elements in the document",
                returns: {
                    desc: "",
                    name: "",
                    type: "HTMLCollection",
                    over: false
                }
            },
            baseURI: {
                type: "property",
                desc: "Returns the absolute base URI of a document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            body: {
                type: "property",
                desc: "Sets or returns the document's body (the <body> element)",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            cookie: {
                type: "property",
                desc: "Returns all name/value pairs of cookies in the document",
                params: [
                    {
                        name: "cookie string",
                        req: false,
                        type: "string",
                        desc: "A String that specifies a semicolon-separated list of name=value pairs, or one name=value pair together with any of the following, optional, values: expires=date, path=path, domain=domainname, secure ",
                    }
                ],
                returns: {
                    desc: "A String, containing the name/value pairs of cookies in the document",
                    name: "cookies",
                    type: "string",
                    over: false
                }
            },
            characterSet: {
                type: "property",
                desc: "Returns the character encoding for the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            defaultView: {
                type: "property",
                desc: "Returns the window object associated with a document, or null if none is available.",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            designMode: {
                type: "property",
                desc: "Controls whether the entire document should be editable or not.",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            doctype: {
                type: "property",
                desc: "Returns the Document Type Declaration associated with the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            documentElement: {
                type: "property",
                desc: "Returns the Document Element of the document (the <html> element)",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            documentMode: {
                type: "property",
                desc: "Returns the mode used by the browser to render the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            documentURI: {
                type: "property",
                desc: "Sets or returns the location of the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            domain: {
                type: "property",
                desc: "Returns the domain name of the server that loaded the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            embeds: {
                type: "HTMLCollection",
                desc: "Returns a collection of all <embed> elements the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            forms: {
                type: "HTMLCollection",
                desc: "Returns a collection of all <form> elements in the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            fullscreenElement: {
                type: "property",
                desc: "Returns the current element that is displayed in fullscreen mode",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            head: {
                type: "property",
                desc: "Returns the <head> element of the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            images: {
                type: "HTMLCollection",
                desc: "Returns a collection of all <img> elements in the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            implementation: {
                type: "property",
                desc: "Returns the DOMImplementation object that handles this document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            inputEncoding: {
                type: "property",
                desc: "Returns the encoding, character set, used for the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            lastModified: {
                type: "property",
                desc: "Returns the date and time the document was last modified",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            links: {
                type: "HTMLCollection",
                desc: "Returns a collection of all <a> and <area> elements in the document that have a href attribute",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            readyState: {
                type: "property",
                desc: "Returns the (loading) status of the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            referrer: {
                type: "property",
                desc: "Returns the URL of the document that loaded the current document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            scripts: {
                type: "HTMLCollection",
                desc: "Returns a collection of <script> elements in the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            strictErrorChecking: {
                type: "property",
                desc: "Sets or returns whether error-checking is enforced or not",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            title: {
                type: "property",
                desc: "Sets or returns the title of the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            URL: {
                type: "property",
                desc: "Returns the full URL of the HTML document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            addEventListener: {
                type: "function",
                desc: "Attaches an event handler to the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            adoptNode: {
                type: "function",
                desc: "Adopts a node from another document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            close: {
                type: "function",
                desc: "Closes the output stream previously opened with document.open()",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            createAttribute: {
                type: "function",
                desc: "Creates an attribute node",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            createComment: {
                type: "function",
                desc: "Creates a Comment node with the specified text",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            createDocumentFragment: {
                type: "function",
                desc: "Creates an empty DocumentFragment node",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            createElement: {
                type: "function",
                desc: "Creates an Element node",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            createEvent: {
                type: "function",
                desc: "Creates a new event",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            createTextNode: {
                type: "function",
                desc: "Creates a Text node",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            execCommand: {
                type: "function",
                desc: "Invokes the specified clipboard operation on the element currently having focus.",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            fullscreenEnabled: {
                type: "function",
                desc: "Returns a Boolean value indicating whether the document can be viewed in fullscreen mode",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            getElementById: {
                type: "function",
                desc: "Returns the element that has the ID attribute with the specified value",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            getElementsByClassName: {
                type: "function",
                desc: "Returns a NodeList containing all elements with the specified class name",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            getElementsByName: {
                type: "function",
                desc: "Returns a NodeList containing all elements with a specified name",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            getElementsByTagName: {
                type: "function",
                desc: "Returns a NodeList containing all elements with the specified tag name",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            hasFocus: {
                type: "function",
                desc: "Returns a Boolean value indicating whether the document has focus",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            importNode: {
                type: "function",
                desc: "Imports a node from another document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            normalize: {
                type: "function",
                desc: "Removes empty Text nodes, and joins adjacent nodes",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            normalizeDocument: {
                type: "function",
                desc: "Removes empty Text nodes, and joins adjacent nodes",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            open: {
                type: "function",
                desc: "Opens an HTML output stream to collect output from document.write()",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            querySelector: {
                type: "function",
                desc: "Returns the first element that matches a specified CSS selector(s) in the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            querySelectorAll: {
                type: "function",
                desc: "Returns a static NodeList containing all elements that matches a specified CSS selector(s) in the document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            removeEventListener: {
                type: "function",
                desc: "Removes an event handler from the document (that has been attached with the addEventListener() method)",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            renameNode: {
                type: "function",
                desc: "Renames the specified node",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            write: {
                type: "function",
                desc: "Writes HTML expressions or JavaScript code to a document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            writeln: {
                type: "function",
                desc: "Same as write(), but adds a newline character after each statement",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
        frameElement: {
            type: "property",
            desc: "Returns the <iframe> element in which the current window is inserted",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        frames: {
            type: "property",
            desc: "Returns all <iframe> elements in the current window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        history: {
            type: "object",
            desc: "The history object properties and methods",

            length: {
                type: "property",
                desc: "Returns the number of URLs in the history list,",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            back: {
                type: "function",
                desc: "Loads the previous URL in the history list",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            forward: {
                type: "function",
                desc: "Loads the next URL in the history list",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            go: {
                type: "function",
                desc: "Loads a specific URL from the history list",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
        innerHeight: {
            type: "property",
            desc: "Returns the height of the window's content area (viewport) including scrollbars",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        innerWidth: {
            type: "property",
            desc: "Returns the width of a window's content area (viewport) including scrollbars",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        length: {
            type: "property",
            desc: "Returns the number of <iframe> elements in the current window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        localStorage: {

            type: "object",
            desc: "Allows to save key/value pairs in a web browser. Stores the data with no expiration date",

            length: {
                type: "property",
                desc: "Returns the number of data items stored in the Storage object",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            key: {
                type: "function",
                desc: ")	Returns the name of the nth key in the storage",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            getItem: {
                type: "function",
                desc: "Returns the value of the specified key name",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            setItem: {
                type: "function",
                desc: "Adds that key to the storage, or update that key's value if it already exists",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            removeItem: {
                type: "function",
                desc: "Removes that key from the storage",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            clear: {
                type: "function",
                desc: "Empty the storage",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
        location: {

            type: "object",
            desc: "The location object properties and methods",

            hash: {
                type: "property",
                desc: "Sets or returns the anchor part (#) of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            host: {
                type: "property",
                desc: "Sets or returns the hostname and port number of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            hostname: {
                type: "property",
                desc: "Sets or returns the hostname of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            href: {
                type: "property",
                desc: "Sets or returns the entire URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            origin: {
                type: "property",
                desc: "Returns the protocol, hostname and port number of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            pathname: {
                type: "property",
                desc: "Sets or returns the path name of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            port: {
                type: "property",
                desc: "Sets or returns the port number of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            protocol: {
                type: "property",
                desc: "Sets or returns the protocol of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            search: {
                type: "property",
                desc: "Sets or returns the querystring part of a URL",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },

            assign: {
                type: "function",
                desc: "Loads a new document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            reload: {
                type: "function",
                desc: "Reloads the current document",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            replace: {
                type: "function",
                desc: "Replaces the current document with a new one",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },

        },
        name: {
            type: "property",
            desc: "Sets or returns the name of a window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        navigator: {
            type: "object",
            desc: "The navigator object properties and methods",
            appCodeName: {
                type: "property",
                desc: "Returns the code name of the browser",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            appName: {
                type: "property",
                desc: "Returns the name of the browser",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            appVersion: {
                type: "property",
                desc: "Returns the version information of the browser",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            cookieEnabled: {
                type: "property",
                desc: "Determines whether cookies are enabled in the browser",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            geolocation: {
                type: "object",
                desc: "The geolocation object properties and methods",
                coordinates: {
                    type: "property",
                    desc: "Returns the position and altitude of the device on Earth",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
                position: {
                    type: "property",
                    desc: "Returns the position of the concerned device at a given time",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
                positionError: {
                    type: "property",
                    desc: "Returns the reason of an error occurring when using the geolocating device",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
                positionOptions: {
                    type: "property",
                    desc: "Describes an object containing option properties to pass as a parameter of Geolocation.getCurrentPosition() and Geolocation.watchPosition()",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
                clearWatch: {
                    type: "function",
                    desc: "Unregister location/error monitoring handlers previously installed using Geolocation.watchPosition()",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
                getCurrentPosition: {
                    type: "function",
                    desc: "Returns the current position of the device",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
                watchPosition: {
                    type: "function",
                    desc: "Returns a watch ID value that then can be used to unregister the handler by passing it to the Geolocation.clearWatch() method",
                    params: [
                        {
                            name: "",
                            req: false,
                            type: "",
                            desc: "",
                        }
                    ],
                    returns: {
                        desc: "",
                        name: "",
                        type: "",
                        over: false
                    }
                },
            },
            language: {
                type: "property",
                desc: "Returns the language of the browser",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            onLine: {
                type: "property",
                desc: "Determines whether the browser is online",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            platform: {
                type: "property",
                desc: "Returns for which platform the browser is compiled",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            product: {
                type: "property",
                desc: "Returns the engine name of the browser",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            userAgent: {
                type: "property",
                desc: "Returns the user-agent header sent by the browser to the server",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
        opener: {
            type: "property",
            desc: "Returns a reference to the window that created the window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        outerHeight: {
            type: "property",
            desc: "Returns the height of the browser window, including toolbars/scrollbars",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        outerWidth: {
            type: "property",
            desc: "Returns the width of the browser window, including toolbars/scrollbars",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        pageXOffset: {
            type: "property",
            desc: "Returns the pixels the current document has been scrolled (horizontally) from the upper left corner of the window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        pageYOffset: {
            type: "property",
            desc: "Returns the pixels the current document has been scrolled (vertically) from the upper left corner of the window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        parent: {
            type: "property",
            desc: "Returns the parent window of the current window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },			
        screen: {
            type: "object",
            desc: "",
            availHeight: {
                type: "property",
                desc: "Returns the height of the screen (excluding the Windows Taskbar)",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            availWidth: {
                type: "property",
                desc: "Returns the width of the screen (excluding the Windows Taskbar)",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            colorDepth: {
                type: "property",
                desc: "Returns the bit depth of the color palette for displaying images",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            height: {
                type: "property",
                desc: "Returns the total height of the screen",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            pixelDepth: {
                type: "property",
                desc: "Returns the color resolution (in bits per pixel) of the screen",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            width: {
                type: "property",
                desc: "Returns the total width of the screen",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
        screenLeft: {
            type: "property",
            desc: "Returns the horizontal coordinate of the window relative to the screen",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        screenTop: {
            type: "property",
            desc: "Returns the vertical coordinate of the window relative to the screen",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        screenX: {
            type: "property",
            desc: "Returns the horizontal coordinate of the window relative to the screen",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        screenY: {
            type: "property",
            desc: "Returns the vertical coordinate of the window relative to the screen",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        sessionStorage: {
            type: "object",
            desc: "Allows to save key/value pairs in a web browser. Stores the data for one session",
            key: {
                type: "function",
                desc: "Returns the name of the nth key in the storage",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            length: {
                type: "property",
                desc: "Returns the number of data items stored in the Storage object",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            getItem: {
                type: "function",
                desc: "Returns the value of the specified key name",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            setItem: {
                type: "function",
                desc: "Adds that key to the storage, or update that key's value if it already exists",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            removeItem: {
                type: "function",
                desc: "Removes that key from the storage",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
            clear: {
                type: "function",
                desc: "Empty all key out of the storage",
                params: [
                    {
                        name: "",
                        req: false,
                        type: "",
                        desc: "",
                    }
                ],
                returns: {
                    desc: "",
                    name: "",
                    type: "",
                    over: false
                }
            },
        },
        scrollX: {
            type: "property",
            desc: "An alias of pageXOffset",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        scrollY: {
            type: "property",
            desc: "An alias of pageYOffset",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        self: {
            type: "property",
            desc: "Returns the current window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        status: {
            type: "property",
            desc: "Sets or returns the text in the statusbar of a window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
        top: {
            type: "property",
            desc: "Returns the topmost browser window",
            params: [
                {
                    name: "",
                    req: false,
                    type: "",
                    desc: "",
                }
            ],
            returns: {
                desc: "",
                name: "",
                type: "",
                over: false
            }
        },
    },
}


/*
//Canvas functions
//Colors Styles and Shadows
//Property	Description
fillStyle	Sets or returns the color, gradient, or pattern used to fill the drawing
strokeStyle	Sets or returns the color, gradient, or pattern used for strokes
shadowColor	Sets or returns the color to use for shadows
shadowBlur	Sets or returns the blur level for shadows
shadowOffsetX	Sets or returns the horizontal distance of the shadow from the shape
shadowOffsetY	Sets or returns the vertical distance of the shadow from the shape

//Method	Description
createLinearGradient()	Creates a linear gradient (to use on canvas content)
createPattern()	Repeats a specified element in the specified direction
createRadialGradient()	Creates a radial/circular gradient (to use on canvas content)
addColorStop()	Specifies the colors and stop positions in a gradient object

//Line Styles
//Property	Description
lineCap	Sets or returns the style of the end caps for a line
lineJoin	Sets or returns the type of corner created, when two lines meet
lineWidth	Sets or returns the current line width
miterLimit	Sets or returns the maximum miter length

//Rectangles
//Method	Description
rect()	Creates a rectangle
fillRect()	Draws a "filled" rectangle
strokeRect()	Draws a rectangle (no fill)
clearRect()	Clears the specified pixels within a given rectangle

//Paths
//Method	Description
fill()	Fills the current drawing (path)
stroke()	Actually draws the path you have defined
beginPath()	Begins a path, or resets the current path
moveTo()	Moves the path to the specified point in the canvas, without creating a line
closePath()	Creates a path from the current point back to the starting point
lineTo()	Adds a new point and creates a line to that point from the last specified point in the canvas
clip()	Clips a region of any shape and size from the original canvas
quadraticCurveTo()	Creates a quadratic B�zier curve
bezierCurveTo()	Creates a cubic B�zier curve
arc()	Creates an arc/curve (used to create circles, or parts of circles)
arcTo()	Creates an arc/curve between two tangents
isPointInPath()	Returns true if the specified point is in the current path, otherwise false

//Transformations
//Method	Description
scale()	Scales the current drawing bigger or smaller
rotate()	Rotates the current drawing
translate()	Remaps the (0,0) position on the canvas
transform()	Replaces the current transformation matrix for the drawing
setTransform()	Resets the current transform to the identity matrix. Then runs transform()

//Text
//Property	Description
font	Sets or returns the current font properties for text content
textAlign	Sets or returns the current alignment for text content
textBaseline	Sets or returns the current text baseline used when drawing text

//Method	Description
fillText()	Draws "filled" text on the canvas
strokeText()	Draws text on the canvas (no fill)
measureText()	Returns an object that contains the width of the specified text

//Image Drawing
//Method	Description
drawImage()	Draws an image, canvas, or video onto the canvas

//Pixel Manipulation
//Property	Description
width	Returns the width of an ImageData object
height	Returns the height of an ImageData object
data	Returns an object that contains image data of a specified ImageData object

//Method	Description
createImageData()	Creates a new, blank ImageData object
getImageData()	Returns an ImageData object that copies the pixel data for the specified rectangle on a canvas
putImageData()	Puts the image data (from a specified ImageData object) back onto the canvas

//Compositing
//Property	Description
globalAlpha	Sets or returns the current alpha or transparency value of the drawing
globalCompositeOperation	Sets or returns how a new image are drawn onto an existing image

//Other
//Method	Description
save()	Saves the state of the current context
restore()	Returns previously saved path state and attributes
createEvent()
getContext()
toDataURL()
*/


