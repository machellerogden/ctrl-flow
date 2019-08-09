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
  "StartAt": "foo-1",
  "States": {
    "foo-1": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:12345679:function:foo",
      "ResultPath": "$.foo-1",
      "Next": "bar-1"
    },
    "bar-1": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:12345679:function:bar",
      "ResultPath": "$.bar-1",
      "Next": "parallel-1"
    },
    "parallel-1": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "a-1",
          "States": {
            "a-1": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:a",
              "ResultPath": "$.a-1",
              "Next": "a-2"
            },
            "a-2": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:12345679:function:a",
              "ResultPath": "$.a-2",
              "End": true
            }
          }
        },
        {
          "StartAt": "c-1",
          "States": {
            "c-1": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:c",
              "ResultPath": "$.c-1",
              "Catch": [
                {
                  "ErrorEqual": [
                    "States.ALL"
                  ],
                  "ResultPath": "$.c-1-error",
                  "Next": "boom"
                }
              ],
              "Next": "d-1"
            },
            "d-1": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:d",
              "ResultPath": "$.d-1",
              "End": true
            }
          }
        }
      ],
      "Next": "choice-1"
    },
    "choice-1": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.foo",
          "StringGreaterThanEquals": "1565317676",
          "Next": "foo-1"
        },
        {
          "Variable": "$.foo",
          "NumericGreaterThanEquals": 1565317676,
          "Next": "foo-1"
        },
        {
          "Variable": "$.foo",
          "TimestampGreaterThanEquals": 1565317676,
          "Next": "foo-1"
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
