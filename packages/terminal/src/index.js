#!/usr/bin/env node
const Lorena = require('@caelumlabs/sdk')
const Wallet = require('@caelumlabs/wallet')

const createWallet = require('./createWallet')
const { importWallet } = require('./manageWallet')

const term = require('./term')
const Commander = require('./Commander')

// Main.
const main = async () => {
  await term.banner('Lorena', 'An awesome framework for Self-Sovereign Identity')
  let username
  let password
  let wallet
  let loginOrAdd
  let lorena

  // Username from import json
  if (process.argv[2]) {
    try {
      const walletObject = await importWallet(process.argv[2])
      username = Object.keys(walletObject)[0]
      wallet = new Wallet(username)
      await wallet.write('info', walletObject[username].info)
      await wallet.write('data', walletObject[username].data)
      term.info(`Using "${username}" as username\n`)
    } catch (_) {
      term.info(`Error reading "${process.argv[2]}\n`)
    }
  } else {
    loginOrAdd = (await term.singleColumnMenu(['Login', 'Add Wallet'])).selectedText
    term.message('\n')
  }

  if (loginOrAdd === 'Login' || username) {
    // If login but we already have username `autocomplete`
    lorena = new Lorena(new Wallet(username || await term.input('Username')), { debug: true, silent: true })
    term.ctrlC(lorena)
    password = await term.input('Password', { echoChar: true })
    while (!(await lorena.unlock(password))) {
      term.error('Incorrect password or username')
      password = await term.input('Password', { echoChar: true })
    }
    term.info('Wallet open')
  } else if (loginOrAdd === 'Add Wallet') {
    const username = await term.input('Username')
    const wallet = new Wallet(username)
    lorena = new Lorena(wallet, { debug: true })
    term.ctrlC(lorena)

    // Check if wallet already exist
    if (await lorena.wallet.exist()) {
      if (!await term.yesOrNo('Wallet already exist, override?')) process.exit()
    }

    const password = await term.input('Password', { echoChar: true })
    /*
    term.message('Please add information on your fist link:\n')
    const didLink = await term.input('DID (did:lor:labtest:12345)')
    const alias = await term.input('ALIAS (defaultLink)')
    options = { did: didLink, alias }
    */

    // Creating wallet
    const network = 'labdev'
    term.message('Creating your wallet in network ' + network + ' \n')
    await createWallet(network, lorena, password)
  }

  // React to messages received.
  await lorena.connect()
  lorena.on('message:credential-ask', async (payload) => term.message('Received credential', payload))
  lorena.on('message:action-post', async (payload) => term.message('Received action', payload))
  lorena.on('contact-incoming', async (payload) => term.message('Contact invitation Incoming from', payload))
  lorena.on('contact-added', async (payload) => term.message('Contact invitation Accepted from', payload))
  lorena.on('error', (e) => term.error(e))
  lorena.on('ready', async () => {
    term.info('Lorena ^+connected^')

    const commander = new Commander(lorena)
    commander.run()
  })
}

main()
