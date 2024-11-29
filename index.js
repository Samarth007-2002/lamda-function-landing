const AWS = require('aws-sdk');
const elbv2 = new AWS.ELBv2();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { loadBalancerArn, targetGroupArn, priority, headerName, headerValue } = body;

    if (!loadBalancerArn || !targetGroupArn || !priority || !headerName || !headerValue) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameters' }),
      };
    }

    const params = {
      Actions: [
        {
          Type: 'forward',
          TargetGroupArn: targetGroupArn,
        },
      ],
      Conditions: [
        {
          Field: 'http-header',
          HttpHeaderConfig: {
            HttpHeaderName: headerName,
            Values: [headerValue]
          }
        }
      ],
      ListenerArn: await getListenerArn(loadBalancerArn),
      Priority: priority,
    };

    const result = await elbv2.createRule(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Rule created successfully',
        ruleArn: result.Rules[0].RuleArn,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error creating rule', error: error.message }),
    };
  }
};

async function getListenerArn(loadBalancerArn) {
  const { Listeners } = await elbv2.describeListeners({ LoadBalancerArn: loadBalancerArn }).promise();
  if (Listeners.length === 0) {
    throw new Error('No listeners found for the given Load Balancer');
  }
  return Listeners[0].ListenerArn;
}
