# ![State of the Arg](sota.png?raw=true)

> sugary-sweet state machine syntax

**Warning: this is an early stage work-in-progress and is under heavy development.**

# install

```sh
npm i sota
```

## what is sota?

Simple: It's just Amazon State Language... with enough sugar piled on
to mask the notoriously bitter aftertaste.

Let's say you saved the following to a file called `state-machine.pdn`...

```
'arn:aws:lambda:us-east-1:12345679:function:foo'
'arn:aws:lambda:us-east-1:12345679:function:bar'
[
  [
    'arn:aws:states:us-east-1:12345679:activity:a'
    'arn:aws:lambda:us-east-1:12345679:function:a'
  ]
  [
    @catch [ 'arn:aws:states:us-east-1:12345679:activity:c', boom ]
    'arn:aws:states:us-east-1:12345679:activity:d'
  ]
]
@if [
  [$.foo >= 1565317676]
  'arn:aws:lambda:us-east-1:12345679:function:foo'
  boom
]
@fail boom
```

And then you ran it through sota like so...

```
cat state-machine.pdn | sota
```

Well, if you did that, you'd get the following:

```json
{
  "StartAt": "foo",
  "States": {
    "foo": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:12345679:function:foo",
      "ResultPath": "$.foo",
      "Next": "bar"
    },
    "bar": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:12345679:function:bar",
      "ResultPath": "$.bar",
      "Next": "parallel"
    },
    "parallel": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "a",
          "States": {
            "a": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:a",
              "ResultPath": "$.a",
              "Next": "a-1"
            },
            "a-1": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:12345679:function:a",
              "ResultPath": "$.a-1",
              "End": true
            }
          }
        },
        {
          "StartAt": "c",
          "States": {
            "c": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:c",
              "ResultPath": "$.c",
              "Catch": [
                {
                  "ErrorEqual": [
                    "States.ALL"
                  ],
                  "ResultPath": "$.c-error",
                  "Next": "boom"
                }
              ],
              "Next": "d"
            },
            "d": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:d",
              "ResultPath": "$.d",
              "End": true
            }
          }
        }
      ],
      "Next": "choice"
    },
    "choice": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.foo",
          "StringGreaterThanEquals": "1565317676",
          "Next": "foo"
        },
        {
          "Variable": "$.foo",
          "NumericGreaterThanEquals": 1565317676,
          "Next": "foo"
        },
        {
          "Variable": "$.foo",
          "TimestampGreaterThanEquals": 1565317676,
          "Next": "foo"
        }
      ],
      "Default": "boom"
    },
    "boom": {
      "Type": "Fail",
      "ResultPath": "$.boom"
    }
  }
}
```
