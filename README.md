# ![State of the Arg](sota.png?raw=true)

> sugary-sweet state machine syntax

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
    'arn:aws:states:us-east-1:12345679:activity:b'
  ]
  [
    'arn:aws:states:us-east-1:12345679:activity:c'
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
  "StartAt": "arn:aws:lambda:us-east-1:12345679:function:foo",
  "States": {
    "arn:aws:lambda:us-east-1:12345679:function:foo": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:12345679:function:foo",
      "ResultPath": "$.arn:aws:lambda:us-east-1:12345679:function:foo",
      "Next": "arn:aws:lambda:us-east-1:12345679:function:bar"
    },
    "arn:aws:lambda:us-east-1:12345679:function:bar": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:12345679:function:bar",
      "ResultPath": "$.arn:aws:lambda:us-east-1:12345679:function:bar",
      "Next": "parallel-1"
    },
    "parallel-1": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "arn:aws:states:us-east-1:12345679:activity:a",
          "States": {
            "arn:aws:states:us-east-1:12345679:activity:a": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:a",
              "ResultPath": "$.arn:aws:states:us-east-1:12345679:activity:a",
              "Next": "arn:aws:states:us-east-1:12345679:activity:b"
            },
            "arn:aws:states:us-east-1:12345679:activity:b": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:b",
              "ResultPath": "$.arn:aws:states:us-east-1:12345679:activity:b",
              "End": true
            }
          }
        },
        {
          "StartAt": "arn:aws:states:us-east-1:12345679:activity:c",
          "States": {
            "arn:aws:states:us-east-1:12345679:activity:c": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:c",
              "ResultPath": "$.arn:aws:states:us-east-1:12345679:activity:c",
              "Next": "arn:aws:states:us-east-1:12345679:activity:d"
            },
            "arn:aws:states:us-east-1:12345679:activity:d": {
              "Type": "Task",
              "Resource": "arn:aws:states:us-east-1:12345679:activity:d",
              "ResultPath": "$.arn:aws:states:us-east-1:12345679:activity:d",
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
          "Next": "arn:aws:lambda:us-east-1:12345679:function:foo"
        },
        {
          "Variable": "$.foo",
          "NumericGreaterThanEquals": 1565317676,
          "Next": "arn:aws:lambda:us-east-1:12345679:function:foo"
        },
        {
          "Variable": "$.foo",
          "TimestampGreaterThanEquals": 1565317676,
          "Next": "arn:aws:lambda:us-east-1:12345679:function:foo"
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
