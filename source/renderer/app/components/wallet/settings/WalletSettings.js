// @flow
import React, { Component } from 'react';
import type { Node } from 'react';
import { observer } from 'mobx-react';
import { defineMessages, intlShape } from 'react-intl';
import moment from 'moment';
import LocalizableError from '../../../i18n/LocalizableError';
import { WALLET_PUBLIC_KEY_SHARING_ENABLED } from '../../../config/walletsConfig';
import BorderedBox from '../../widgets/BorderedBox';
import InlineEditingInput from '../../widgets/forms/InlineEditingInput';
import ReadOnlyInput from '../../widgets/forms/ReadOnlyInput';
import WalletPublicKeyField from './WalletPublicKeyField';
import WalletPublicKeyQRCodeDialog from './WalletPublicKeyQRCodeDialog';
import DeleteWalletButton from './DeleteWalletButton';
import DeleteWalletConfirmationDialog from './DeleteWalletConfirmationDialog';
import ChangeSpendingPasswordDialog from './ChangeSpendingPasswordDialog';
import globalMessages from '../../../i18n/global-messages';
import styles from './WalletSettings.scss';
import WalletRecoveryPhraseVerificationWidget from './WalletRecoveryPhraseVerificationWidget';
import { momentLocales } from '../../../../../common/types/locales.types';
import type { Locale } from '../../../../../common/types/locales.types';

export const messages = defineMessages({
  assuranceLevelLabel: {
    id: 'wallet.settings.assurance',
    defaultMessage: '!!!Transaction assurance security level',
    description:
      'Label for the "Transaction assurance security level" dropdown.',
  },
  deleteWalletHeader: {
    id: 'wallet.settings.deleteWallet.header',
    defaultMessage: '!!!Delete wallet',
    description: 'Delete wallet header on the wallet settings page.',
  },
  deleteWalletWarning1: {
    id: 'wallet.settings.deleteWallet.warning1',
    defaultMessage:
      '!!!Once you delete this wallet it will be removed from the Daedalus interface and you will lose access to any remaining funds in the wallet. The only way to regain access after deletion is by restoring it using your wallet recovery phrase.',
    description: 'Delete wallet warning explaining the consequences.',
  },
  deleteWalletWarning2: {
    id: 'wallet.settings.deleteWallet.warning2',
    defaultMessage:
      '!!!You may wish to verify your recovery phrase before deletion to ensure that you can restore this wallet in the future, if desired.',
    description: 'Delete wallet warning explaining the consequences.',
  },
  name: {
    id: 'wallet.settings.name.label',
    defaultMessage: '!!!Name',
    description: 'Label for the "Name" text input on the wallet settings page.',
  },
  passwordLabel: {
    id: 'wallet.settings.password',
    defaultMessage: '!!!Password',
    description: 'Label for the "Password" field.',
  },
  passwordLastUpdated: {
    id: 'wallet.settings.passwordLastUpdated',
    defaultMessage: '!!!Last updated',
    description: 'Last updated X time ago message.',
  },
  passwordNotSet: {
    id: 'wallet.settings.passwordNotSet',
    defaultMessage: "!!!You still don't have password",
    description: "You still don't have password set message.",
  },
});

type Props = {
  walletName: string,
  walletPublicKey: ?string,
  creationDate: Date,
  spendingPasswordUpdateDate: ?Date,
  error?: ?LocalizableError,
  getWalletPublicKey: Function,
  openDialogAction: Function,
  isDialogOpen: Function,
  onFieldValueChange: Function,
  onStartEditing: Function,
  onStopEditing: Function,
  onCancel: Function,
  onVerifyRecoveryPhrase: Function,
  onCopyWalletPublicKey: Function,
  nameValidator: Function,
  isIncentivizedTestnet: boolean,
  isLegacy: boolean,
  changeSpendingPasswordDialog: Node,
  walletPublicKeyQRCodeDialogContainer: Node,
  deleteWalletDialogContainer: Node,
  shouldDisplayRecoveryPhrase: boolean,
  recoveryPhraseVerificationDate: ?Date,
  recoveryPhraseVerificationStatus: string,
  recoveryPhraseVerificationStatusType: string,
  wordCount: number,
  locale: Locale,
  isSpendingPasswordSet: boolean,
  isHardwareWallet: boolean,
};

type State = {
  isFormBlocked: boolean,
};

@observer
export default class WalletSettings extends Component<Props, State> {
  static contextTypes = {
    intl: intlShape.isRequired,
  };

  state = {
    isFormBlocked: false,
  };

  componentDidUpdate() {
    const { isDialogOpen } = this.props;
    const { isFormBlocked } = this.state;
    // Set "name" input to active and "unblock form" on Dialog close
    if (
      !isDialogOpen(DeleteWalletConfirmationDialog) &&
      !isDialogOpen(ChangeSpendingPasswordDialog) &&
      isFormBlocked
    ) {
      this.unblockForm();
    }
  }

  componentWillUnmount() {
    // This call is used to prevent display of old successfully-updated messages
    this.props.onCancel();
  }

  onBlockForm = () => {
    this.setState({ isFormBlocked: true });
  };

  unblockForm = () => {
    this.setState({ isFormBlocked: false });
  };

  renderWalletPublicKeyBox = () => {
    const {
      walletPublicKey,
      locale,
      getWalletPublicKey,
      onCopyWalletPublicKey,
      openDialogAction,
      isDialogOpen,
      walletPublicKeyQRCodeDialogContainer,
    } = this.props;

    if (!WALLET_PUBLIC_KEY_SHARING_ENABLED) {
      return null;
    }

    return (
      <>
        <BorderedBox className={styles.walletPublicKeyBox}>
          <WalletPublicKeyField
            walletPublicKey={walletPublicKey || ''}
            locale={locale}
            onCopyWalletPublicKey={onCopyWalletPublicKey}
            onShowQRCode={() =>
              openDialogAction({ dialog: WalletPublicKeyQRCodeDialog })
            }
            getWalletPublicKey={getWalletPublicKey}
          />
        </BorderedBox>
        {isDialogOpen(WalletPublicKeyQRCodeDialog)
          ? walletPublicKeyQRCodeDialogContainer
          : false}
      </>
    );
  };

  renderDeleteWalletBox = () => {
    const { intl } = this.context;
    const {
      openDialogAction,
      isDialogOpen,
      deleteWalletDialogContainer,
    } = this.props;

    return (
      <>
        <BorderedBox className={styles.deleteWalletBox}>
          <span>{intl.formatMessage(messages.deleteWalletHeader)}</span>
          <div className={styles.contentBox}>
            <div>
              <p>{intl.formatMessage(messages.deleteWalletWarning1)}</p>
              <p>{intl.formatMessage(messages.deleteWalletWarning2)}</p>
            </div>
            <DeleteWalletButton
              onClick={() => {
                this.onBlockForm();
                openDialogAction({
                  dialog: DeleteWalletConfirmationDialog,
                });
              }}
            />
          </div>
        </BorderedBox>
        {isDialogOpen(DeleteWalletConfirmationDialog)
          ? deleteWalletDialogContainer
          : false}
      </>
    );
  };

  render() {
    const { intl } = this.context;
    const {
      walletName,
      creationDate,
      spendingPasswordUpdateDate,
      error,
      isDialogOpen,
      openDialogAction,
      onFieldValueChange,
      onStartEditing,
      onStopEditing,
      onCancel,
      onVerifyRecoveryPhrase,
      nameValidator,
      isIncentivizedTestnet,
      isLegacy,
      changeSpendingPasswordDialog,
      recoveryPhraseVerificationDate,
      recoveryPhraseVerificationStatus,
      recoveryPhraseVerificationStatusType,
      locale,
      isSpendingPasswordSet,
      isHardwareWallet,
      shouldDisplayRecoveryPhrase,
      wordCount,
    } = this.props;
    const { isFormBlocked } = this.state;

    // Set Japanese locale to moment. Default is en-US
    moment.locale(momentLocales[locale]);

    if (isLegacy && isIncentivizedTestnet) {
      return (
        <div className={styles.component}>
          {this.renderWalletPublicKeyBox()}
          {this.renderDeleteWalletBox()}
        </div>
      );
    }

    const passwordMessage = isSpendingPasswordSet
      ? intl.formatMessage(messages.passwordLastUpdated, {
          lastUpdated: moment(spendingPasswordUpdateDate)
            .locale(this.context.intl.locale)
            .fromNow(),
        })
      : intl.formatMessage(messages.passwordNotSet);

    return (
      <div className={styles.component}>
        <BorderedBox>
          <InlineEditingInput
            className="walletName"
            label={intl.formatMessage(messages.name)}
            value={walletName}
            maxLength={40}
            onFocus={() => onStartEditing('name')}
            onBlur={onStopEditing}
            onCancel={onCancel}
            onSubmit={(value) => onFieldValueChange('name', value)}
            isValid={nameValidator}
            valueErrorMessage={intl.formatMessage(
              globalMessages.invalidWalletName
            )}
            readOnly={isFormBlocked}
          />

          {!isHardwareWallet && (
            <ReadOnlyInput
              label={intl.formatMessage(messages.passwordLabel)}
              value={passwordMessage}
              isSet={isSpendingPasswordSet}
              onClick={() => {
                this.onBlockForm();
                openDialogAction({
                  dialog: ChangeSpendingPasswordDialog,
                });
              }}
            />
          )}

          {shouldDisplayRecoveryPhrase && (
            <WalletRecoveryPhraseVerificationWidget
              onVerify={onVerifyRecoveryPhrase}
              recoveryPhraseVerificationDate={recoveryPhraseVerificationDate}
              recoveryPhraseVerificationStatus={
                recoveryPhraseVerificationStatus
              }
              recoveryPhraseVerificationStatusType={
                recoveryPhraseVerificationStatusType
              }
              creationDate={creationDate}
              locale={locale}
              wordCount={wordCount}
              isLegacy={isLegacy}
            />
          )}

          {error && <p className={styles.error}>{intl.formatMessage(error)}</p>}
        </BorderedBox>

        {isDialogOpen(ChangeSpendingPasswordDialog)
          ? changeSpendingPasswordDialog
          : false}

        {this.renderWalletPublicKeyBox()}
        {this.renderDeleteWalletBox()}
      </div>
    );
  }
}
