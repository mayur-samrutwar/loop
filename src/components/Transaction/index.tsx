'use client';

import TestContractABI from '@/abi/TestContract.json';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, encodeFunctionData, http } from 'viem';
import { worldchain } from 'viem/chains';

const contractAbi = TestContractABI as readonly unknown[];

/**
 * Mint flow updated for MiniKit 2 `sendTransaction` (calldata + chainId).
 * Permit2 placeholder signing is not included here; encode calldata separately if needed.
 */
export const Transaction = () => {
  const myContractToken =
    '0xF0882554ee924278806d708396F1a7975b732522' as `0x${string}`;
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);
  const [whichButton, setWhichButton] = useState<'getToken' | 'usePermit2'>(
    'getToken',
  );

  const [transactionId, setTransactionId] = useState<string>('');

  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    client: client,
    appConfig: {
      app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
    },
    transactionId: transactionId,
  });

  useEffect(() => {
    if (transactionId && !isConfirming) {
      if (isConfirmed) {
        console.log('Transaction confirmed!');
        setButtonState('success');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      } else if (isError) {
        console.error('Transaction failed:', error);
        setButtonState('failed');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      }
    }
  }, [isConfirmed, isConfirming, isError, error, transactionId]);

  const onClickGetToken = async () => {
    setTransactionId('');
    setWhichButton('getToken');
    setButtonState('pending');

    try {
      const data = encodeFunctionData({
        abi: contractAbi,
        functionName: 'mintToken',
        args: [],
      });

      const result = await MiniKit.sendTransaction({
        chainId: worldchain.id,
        transactions: [{ to: myContractToken, data }],
      });

      const payload = result.data as { userOpHash?: string; status?: string };
      if (payload?.userOpHash) {
        console.log(
          'Transaction submitted, waiting for confirmation:',
          payload.userOpHash,
        );
        setTransactionId(payload.userOpHash);
      } else {
        console.error('Transaction submission failed:', result.data);
        setButtonState('failed');
        setTimeout(() => {
          setButtonState(undefined);
        }, 3000);
      }
    } catch (err) {
      console.error('Error sending transaction:', err);
      setButtonState('failed');
      setTimeout(() => {
        setButtonState(undefined);
      }, 3000);
    }
  };

  const onClickUsePermit2 = async () => {
    setWhichButton('usePermit2');
    setButtonState('failed');
    console.warn(
      'Permit2 demo requires encoded calldata for MiniKit v2; use the mint flow or build calldata with viem + Permit2 SDK.',
    );
    setTimeout(() => setButtonState(undefined), 2500);
  };

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Transaction</p>
      <LiveFeedback
        label={{
          failed: 'Transaction failed',
          pending: 'Transaction pending',
          success: 'Transaction successful',
        }}
        state={whichButton === 'getToken' ? buttonState : undefined}
        className="w-full"
      >
        <Button
          onClick={onClickGetToken}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Get Token
        </Button>
      </LiveFeedback>
      <LiveFeedback
        label={{
          failed: 'Not available in template',
          pending: 'Transaction pending',
          success: 'Transaction successful',
        }}
        state={whichButton === 'usePermit2' ? buttonState : undefined}
        className="w-full"
      >
        <Button
          onClick={onClickUsePermit2}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="tertiary"
          className="w-full"
        >
          Use Permit2 (disabled)
        </Button>
      </LiveFeedback>
    </div>
  );
};
