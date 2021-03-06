import {equal} from 'assert'
import {readFileSync, writeFileSync} from 'fs'
import {join} from 'path'
import {CpxFile} from '../src'

const file = readFileSync(join(__dirname, 'input.cpn'))

const cpxFile = new CpxFile(file)

const buffer = cpxFile.getBuffer()
writeFileSync(join(__dirname, 'output.cpn'), buffer)

// eslint-disable-next-line no-console
console.log('write success')

const newCpx = new CpxFile(buffer, 'utf8')
equal(newCpx.getBuffer().length, buffer.length)
