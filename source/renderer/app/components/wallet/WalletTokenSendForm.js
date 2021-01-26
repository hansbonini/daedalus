// @flow
import React, { Component } from 'react';
import type { Node } from 'react';
import { observer } from 'mobx-react';
import { Button } from 'react-polymorph/lib/components/Button';
import { Input } from 'react-polymorph/lib/components/Input';
import { NumericInput } from 'react-polymorph/lib/components/NumericInput';
import { ButtonSkin } from 'react-polymorph/lib/skins/simple/ButtonSkin';
import { InputSkin } from 'react-polymorph/lib/skins/simple/InputSkin';
import { defineMessages, intlShape } from 'react-intl';
import vjf from 'mobx-react-form/lib/validators/VJF';
import BigNumber from 'bignumber.js';
import { get } from 'lodash';
import { PopOver } from 'react-polymorph/lib/components/PopOver';
import SVGInline from 'react-svg-inline';
import classNames from 'classnames';
import ReactToolboxMobxForm from '../../utils/ReactToolboxMobxForm';
import { submitOnEnter } from '../../utils/form';
import AmountInputSkin from './skins/AmountInputSkin';
import BorderedBox from '../widgets/BorderedBox';
import LoadingSpinner from '../widgets/LoadingSpinner';
import styles from './WalletTokenSendForm.scss';
import globalMessages from '../../i18n/global-messages';
import WalletSendConfirmationDialogContainer from '../../containers/wallet/dialogs/WalletSendConfirmationDialogContainer';
import {
  formattedAmountToNaturalUnits,
  formattedAmountToLovelace,
  // formattedWalletAmount,
} from '../../utils/formatters';
import { FORM_VALIDATION_DEBOUNCE_WAIT } from '../../config/timingConfig';
import { FormattedHTMLMessageWithLink } from '../widgets/FormattedHTMLMessageWithLink';
import { NUMBER_FORMATS } from '../../../../common/types/number.types';
/* eslint-disable consistent-return */
import { messages as apiErrorMessages } from '../../api/errors';
import type { HwDeviceStatus } from '../../domains/Wallet';
import WalletTokenSendConfirmationDialog from './WalletTokenSendConfirmationDialog';
import Wallet from '../../domains/Wallet';
import closeIcon from '../../assets/images/close-cross.inline.svg';

export const messages = defineMessages({
  titleLabel: {
    id: 'wallet.send.form.title.label',
    defaultMessage: '!!!Title',
    description: 'Label for the "Title" text input in the wallet send form.',
  },
  titleHint: {
    id: 'wallet.send.form.title.hint',
    defaultMessage: '!!!E.g: Money for Frank',
    description:
      'Hint inside the "Receiver" text input in the wallet send form.',
  },
  receiverLabel: {
    id: 'wallet.send.form.receiver.label',
    defaultMessage: '!!!Receiver',
    description: 'Label for the "Receiver" text input in the wallet send form.',
  },
  receiverHint: {
    id: 'wallet.send.form.receiver.placeholder',
    defaultMessage: '!!!Paste an address',
    description:
      'Hint inside the "Receiver" text input in the wallet send form.',
  },
  amountLabel: {
    id: 'wallet.send.form.amount.label',
    defaultMessage: '!!!Amount',
    description: 'Label for the "Amount" number input in the wallet send form.',
  },
  depositLabel: {
    id: 'wallet.send.form.deposit.label',
    defaultMessage: '!!!Deposit',
    description:
      'Label for the "Deposit" number input in the wallet send form.',
  },
  addNewReceiverButtonLabel: {
    id: 'wallet.send.form.button.addNewReceiver',
    defaultMessage: '!!!+ Add another receiver',
    description:
      'Label for the "+ Add another receiver" button in the wallet send form.',
  },
  removeReceiverButtonLabel: {
    id: 'wallet.send.form.button.removeReceiver',
    defaultMessage: '!!!Remove',
    description:
      'Label for the "Remove" button in the wallet send form.',
  },
  estimatedFeeLabel: {
    id: 'wallet.send.form.estimatedFee.label',
    defaultMessage: '!!!Estimated fees',
    description:
      'Label for the "Estimated fees" number input in the wallet send form.',
  },
  ofLabel: {
    id: 'wallet.send.form.of.label',
    defaultMessage: '!!!of',
    description: 'Label for the "of" max ADA value in the wallet send form.',
  },
  descriptionLabel: {
    id: 'wallet.send.form.description.label',
    defaultMessage: '!!!Description',
    description:
      'Label for the "description" text area in the wallet send form.',
  },
  descriptionHint: {
    id: 'wallet.send.form.description.hint',
    defaultMessage: '!!!You can add a message if you want',
    description: 'Hint in the "description" text area in the wallet send form.',
  },
  resetButtonLabel: {
    id: 'wallet.send.form.reset',
    defaultMessage: '!!!Reset',
    description: 'Label for the reset button on the wallet send form.',
  },
  sendButtonLabel: {
    id: 'wallet.send.form.send',
    defaultMessage: '!!!Send',
    description: 'Label for the send button on the wallet send form.',
  },
  maxButton: {
    id: 'wallet.send.form.maxButton',
    defaultMessage: '!!!Max',
    description: 'Max button label on the wallet send form',
  },
  invalidAmount: {
    id: 'wallet.send.form.errors.invalidAmount',
    defaultMessage: '!!!Please enter a valid amount.',
    description: 'Error message shown when invalid amount was entered.',
  },
  invalidTitle: {
    id: 'wallet.send.form.errors.invalidTitle',
    defaultMessage: '!!!Please enter a title with at least 3 characters.',
    description:
      'Error message shown when invalid transaction title was entered.',
  },
  syncingTransactionsMessage: {
    id: 'wallet.send.form.syncingTransactionsMessage',
    defaultMessage:
      '!!!This wallet is currently being synced with the blockchain. While synchronisation is in progress transacting is not possible and transaction history is not complete.',
    description:
      'Syncing transactions message shown during async wallet restore in the wallet send form.',
  },
});

messages.fieldIsRequired = globalMessages.fieldIsRequired;

type Props = {
  currencyUnit: string,
  currencyMaxIntegerDigits?: number,
  currencyMaxFractionalDigits: number,
  validateAmount: (amountInNaturalUnits: string) => Promise<boolean>,
  calculateTransactionFee: (
    address: string,
    amount: number
  ) => Promise<BigNumber>,
  currentNumberFormat: string,
  walletAmount: BigNumber,
  addressValidator: Function,
  openDialogAction: Function,
  isDialogOpen: Function,
  onExternalLinkClick?: Function,
  isRestoreActive: boolean,
  hwDeviceStatus: HwDeviceStatus,
  isHardwareWallet: boolean,
  nativeTokens: Array<Wallet>,
  isClearTooltipOpeningDownward?: boolean,
};

type State = {
  isTransactionFeeCalculated: boolean,
  transactionFee: BigNumber,
  feeCalculationRequestQue: number,
  transactionFeeError: ?string | ?Node,
};

@observer
export default class WalletTokenSendForm extends Component<Props, State> {
  static contextTypes = {
    intl: intlShape.isRequired,
  };

  state = {
    isTransactionFeeCalculated: false,
    transactionFee: new BigNumber(0),
    feeCalculationRequestQue: 0,
    transactionFeeError: null,
  };

  // We need to track the fee calculation state in order to disable
  // the "Submit" button as soon as either receiver or amount field changes.
  // This is required as we are using debounced validation and we need to
  // disable the "Submit" button as soon as the value changes and then wait for
  // the validation to end in order to see if the button should be enabled or not.
  _isCalculatingTransactionFee = false;

  // We need to track the mounted state in order to avoid calling
  // setState promise handling code after the component was already unmounted:
  // Read more: https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleOnSubmit = () => {
    if (this.isDisabled()) {
      return false;
    }
    this.props.openDialogAction({
      dialog: WalletTokenSendConfirmationDialog,
    });
  };

  clearReceiverAddress = () => {
    const receiverField = this.form.$('receiver');
    receiverField.clear();
  };

  addMaxAmount = () => {
    const amountField = this.form.$('amount');
    const { nativeTokens } = this.props;
    const maxWalletAmount =
      nativeTokens && nativeTokens.length
        ? nativeTokens[0].amount.toNumber()
        : null;
    if (maxWalletAmount) amountField.set(maxWalletAmount);
  };

  handleOnReset = () => {
    this.form.reset();
  };

  handleSubmitOnEnter = submitOnEnter.bind(this, this.handleOnSubmit);

  isDisabled = () =>
    this._isCalculatingTransactionFee || !this.state.isTransactionFeeCalculated;

  // FORM VALIDATION
  form = new ReactToolboxMobxForm(
    {
      fields: {
        receiver: {
          label: this.context.intl.formatMessage(messages.receiverLabel),
          placeholder: this.context.intl.formatMessage(messages.receiverHint),
          value: '',
          validators: [
            async ({ field, form }) => {
              const { value } = field;
              if (value === '') {
                this.resetTransactionFee();
                return [
                  false,
                  this.context.intl.formatMessage(messages.fieldIsRequired),
                ];
              }
              const amountField = form.$('amount');
              const isAmountValid = amountField.isValid;
              const isValidAddress = await this.props.addressValidator(value);
              if (isValidAddress && isAmountValid) {
                const amountValue = amountField.value.toString();
                this.calculateTransactionFee(value, amountValue);
              } else {
                this.resetTransactionFee();
              }
              return [
                isValidAddress,
                this.context.intl.formatMessage(
                  apiErrorMessages.invalidAddress
                ),
              ];
            },
          ],
        },
        amount: {
          label: this.context.intl.formatMessage(messages.amountLabel),
          placeholder: `0${
            this.getCurrentNumberFormat().decimalSeparator
          }${'0'.repeat(this.props.currencyMaxFractionalDigits)}`,
          value: null,
          validators: [
            async ({ field, form }) => {
              if (field.value === null) {
                this.resetTransactionFee();
                return [
                  false,
                  this.context.intl.formatMessage(messages.fieldIsRequired),
                ];
              }
              const amountValue = field.value.toString();
              const isValid = await this.props.validateAmount(
                formattedAmountToNaturalUnits(amountValue)
              );
              const receiverField = form.$('receiver');
              const receiverValue = receiverField.value;
              const isReceiverValid = receiverField.isValid;
              if (isValid && isReceiverValid) {
                this.calculateTransactionFee(receiverValue, amountValue);
              } else {
                this.resetTransactionFee();
              }
              return [
                isValid,
                this.context.intl.formatMessage(messages.invalidAmount),
              ];
            },
          ],
        },
        deposit: {
          label: this.context.intl.formatMessage(messages.depositLabel),
          placeholder: `0${
            this.getCurrentNumberFormat().decimalSeparator
          }${'0'.repeat(this.props.currencyMaxFractionalDigits)}`,
          value: `1${
            this.getCurrentNumberFormat().decimalSeparator
          }${'0'.repeat(this.props.currencyMaxFractionalDigits)}`,
        },
        estimatedFee: {
          label: this.context.intl.formatMessage(messages.estimatedFeeLabel),
          placeholder: `0${
            this.getCurrentNumberFormat().decimalSeparator
          }${'0'.repeat(this.props.currencyMaxFractionalDigits)}`,
          value: null,
        },
      },
    },
    {
      plugins: { vjf: vjf() },
      options: {
        validateOnBlur: false,
        validateOnChange: true,
        validationDebounceWait: FORM_VALIDATION_DEBOUNCE_WAIT,
      },
    }
  );

  resetTransactionFee() {
    if (this._isMounted) {
      this._isCalculatingTransactionFee = false;
      this.setState({
        isTransactionFeeCalculated: false,
        transactionFee: new BigNumber(0),
        transactionFeeError: null,
      });
    }
  }

  isLatestTransactionFeeRequest = (
    currentFeeCalculationRequestQue: number,
    prevFeeCalculationRequestQue: number
  ) => currentFeeCalculationRequestQue - prevFeeCalculationRequestQue === 1;

  calculateTransactionFee = async (address: string, amountValue: string) => {
    const amount = formattedAmountToLovelace(amountValue);
    const {
      feeCalculationRequestQue: prevFeeCalculationRequestQue,
    } = this.state;
    this.setState((prevState) => ({
      isTransactionFeeCalculated: false,
      transactionFee: new BigNumber(0),
      transactionFeeError: null,
      feeCalculationRequestQue: prevState.feeCalculationRequestQue + 1,
    }));
    try {
      const fee = await this.props.calculateTransactionFee(address, amount);
      if (
        this._isMounted &&
        this.isLatestTransactionFeeRequest(
          this.state.feeCalculationRequestQue,
          prevFeeCalculationRequestQue
        )
      ) {
        this._isCalculatingTransactionFee = false;
        this.setState({
          isTransactionFeeCalculated: true,
          transactionFee: fee,
          transactionFeeError: null,
        });
      }
    } catch (error) {
      if (
        this._isMounted &&
        this.isLatestTransactionFeeRequest(
          this.state.feeCalculationRequestQue,
          prevFeeCalculationRequestQue
        )
      ) {
        const errorHasLink = !!get(error, ['values', 'linkLabel']);
        const transactionFeeError = errorHasLink ? (
          <FormattedHTMLMessageWithLink
            message={error}
            onExternalLinkClick={this.props.onExternalLinkClick}
          />
        ) : (
          this.context.intl.formatMessage(error)
        );
        this._isCalculatingTransactionFee = false;
        this.setState({
          isTransactionFeeCalculated: false,
          transactionFee: new BigNumber(0),
          transactionFeeError,
        });
      }
    }
  };

  getCurrentNumberFormat() {
    return NUMBER_FORMATS[this.props.currentNumberFormat];
  }

  get hasReceiverClearButton() {
    const receiverField = this.form.$('receiver');
    return receiverField.value.length > 0;
  }

  renderAssetRow() {

  }

  renderReceiverRow() {

  }

  removeReceiverRow() {

  }

  render() {
    const { form } = this;
    const { intl } = this.context;
    const {
      currencyUnit,
      currencyMaxFractionalDigits,
      isDialogOpen,
      isRestoreActive,
      onExternalLinkClick,
      hwDeviceStatus,
      isHardwareWallet,
      nativeTokens,
      isClearTooltipOpeningDownward,
      // walletAmount,
    } = this.props;

    const {
      isTransactionFeeCalculated,
      transactionFee,
      transactionFeeError,
    } = this.state;
    const amountField = form.$('amount');
    const receiverField = form.$('receiver');
    const estimatedField = form.$('estimatedFee');
    // const depositField = form.$('deposit');
    const receiverFieldProps = receiverField.bind();
    const amountFieldProps = amountField.bind();
    const estimatedFieldProps = estimatedField.bind();
    // const depositFieldProps = depositField.bind();

    const amount = new BigNumber(amountFieldProps.value || 0);

    let fees = null;
    let total = null;
    if (isTransactionFeeCalculated) {
      fees = transactionFee.toFormat(currencyMaxFractionalDigits);
      total = amount.add(transactionFee).toFormat(currencyMaxFractionalDigits);
    }

    // const selectedNativeToken =
    //  nativeTokens && nativeTokens.length ? nativeTokens[0] : null;

    const removeReceiverButtonClasses = classNames([
      styles.removeReceiverButton,
      'flat',
    ]);

    const newReceiverButtonClasses = classNames([
      styles.addNewReceiverButton,
      'flat',
    ]);

    return (
      <div className={styles.component}>
        {isRestoreActive ? (
          <div className={styles.syncingTransactionsWrapper}>
            <LoadingSpinner big />
            <p className={styles.syncingTransactionsText}>
              {intl.formatMessage(messages.syncingTransactionsMessage)}
            </p>
          </div>
        ) : (
          <BorderedBox>
            <div className={styles.walletTokenSendForm}>
              <div className={styles.walletTokenSendFormContainer}>
                {/* <div className={styles.fieldsLine} /> */}
                <div className={styles.fieldsContainer}>
                  <div className={styles.receiverInput}>
                    {this.hasReceiverClearButton && (
                      <Button
                        className={removeReceiverButtonClasses}
                        label={intl.formatMessage(messages.removeReceiverButtonLabel)}
                        onClick={this.removeReceiverRow}
                        skin={ButtonSkin}
                      />
                    )}
                    <Input
                      className="receiver"
                      label={intl.formatMessage(messages.receiverLabel)}
                      {...receiverField.bind()}
                      error={receiverField.error}
                      onChange={(value) => {
                        this._isCalculatingTransactionFee = true;
                        receiverField.onChange(value || '');
                        if (value) {
                          this.renderAssetRow();
                        }
                      }}
                      skin={InputSkin}
                      onKeyPress={this.handleSubmitOnEnter}
                    />
                    {this.hasReceiverClearButton && (
                      <div className={styles.clearReceiverContainer}>
                        <PopOver
                          content="Clear"
                          placement={
                            isClearTooltipOpeningDownward ? 'bottom' : 'top'
                          }
                        >
                          <button
                            onClick={() => this.clearReceiverAddress()}
                            className={styles.clearReceiverButton}
                          >
                            <SVGInline
                              svg={closeIcon}
                              className={styles.clearReceiverIcon}
                            />
                          </button>
                        </PopOver>
                      </div>
                    )}
                  </div>
                  { /*
                  <div className={styles.amountInput}>
                    {selectedNativeToken && (
                      <div className={styles.amountTokenTotal}>
                        {intl.formatMessage(messages.ofLabel)}&nbsp;
                        {formattedWalletAmount(
                          selectedNativeToken.amount,
                          false
                        )}
                        &nbsp;{currencyUnit}
                      </div>
                    )}
                    <NumericInput
                      {...amountFieldProps}
                      className="amount"
                      label={intl.formatMessage(messages.amountLabel)}
                      numberFormat={this.getCurrentNumberFormat()}
                      numberLocaleOptions={{
                        minimumFractionDigits: currencyMaxFractionalDigits,
                      }}
                      error={transactionFeeError || amountField.error}
                      onChange={(value) => {
                        this._isCalculatingTransactionFee = true;
                        amountField.onChange(value);
                        estimatedField.onChange(fees);
                      }}
                      currency={currencyUnit}
                      fees={fees}
                      total={total}
                      skin={AmountInputSkin}
                      onKeyPress={this.handleSubmitOnEnter}
                      allowSigns={false}
                      isCalculatingFees={this._isCalculatingTransactionFee}
                    />
                    <div className={styles.maxAmountContainer}>
                      <PopOver
                        content="Max"
                        placement={
                          isClearTooltipOpeningDownward ? 'bottom' : 'top'
                        }
                      >
                        <button
                          onClick={() => this.addMaxAmount()}
                          className={styles.maxAmountButton}
                        >
                          {intl.formatMessage(messages.maxButton)}
                        </button>
                      </PopOver>
                    </div>
                  </div> */ }
                  { /*
                  <div className={styles.depositInput}>
                    <div className={styles.depositAdaTotal}>
                      {intl.formatMessage(messages.ofLabel)}&nbsp;
                      {formattedWalletAmount(walletAmount)}
                    </div>
                    <NumericInput
                      {...depositFieldProps}
                      className="deposit"
                      label={intl.formatMessage(messages.depositLabel)}
                      numberFormat={this.getCurrentNumberFormat()}
                      numberLocaleOptions={{
                        minimumFractionDigits: currencyMaxFractionalDigits,
                      }}
                      currency={intl.formatMessage(globalMessages.unitAda)}
                      skin={AmountInputSkin}
                      disabled
                    />
                  </div>
                  */ }
                  {this.hasReceiverClearButton && (
                    <Button
                      className={newReceiverButtonClasses}
                      label={intl.formatMessage(messages.addNewReceiverButtonLabel)}
                      onClick={this.renderReceiverRow}
                      skin={ButtonSkin}
                    />
                  )}
                </div>
              </div>
              <div className={styles.estimatedFeeInput}>
                <NumericInput
                  {...estimatedFieldProps}
                  className="estimatedFee"
                  label={intl.formatMessage(messages.estimatedFeeLabel)}
                  numberFormat={this.getCurrentNumberFormat()}
                  numberLocaleOptions={{
                    minimumFractionDigits: currencyMaxFractionalDigits,
                  }}
                  currency={intl.formatMessage(globalMessages.unitAda)}
                  fees={fees}
                  total={total}
                  skin={AmountInputSkin}
                  disabled
                />
              </div>
              <div className={styles.buttonsContainer}>
                <Button
                  className="flat"
                  label={intl.formatMessage(messages.resetButtonLabel)}
                  onClick={this.handleOnReset}
                  skin={ButtonSkin}
                />
                <Button
                  className="primary"
                  label={intl.formatMessage(messages.sendButtonLabel)}
                  onClick={this.handleOnSubmit}
                  skin={ButtonSkin}
                  disabled={this.isDisabled()}
                />
              </div>
            </div>
          </BorderedBox>
        )}

        {isDialogOpen(WalletTokenSendConfirmationDialog) ? (
          <WalletSendConfirmationDialogContainer
            amount={amount.toFormat(currencyMaxFractionalDigits)}
            receiver={receiverFieldProps.value}
            receivers={[receiverFieldProps.value, receiverFieldProps.value]}
            totalAmount={total}
            transactionFee={fees}
            amountToNaturalUnits={formattedAmountToNaturalUnits}
            currencyUnit={currencyUnit}
            onExternalLinkClick={onExternalLinkClick}
            hwDeviceStatus={hwDeviceStatus}
            isHardwareWallet={isHardwareWallet}
            nativeTokens={nativeTokens}
          />
        ) : null}
      </div>
    );
  }
}
