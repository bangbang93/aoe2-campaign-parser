import {readFileSync, writeFileSync} from 'fs'
import {join} from 'path'
import {CpxFile} from '../src/cpx-file'

const file = readFileSync(join(__dirname, '1-9.cpn'))

const cpxFile = new CpxFile(file)

cpxFile.transcode()
const buffer = cpxFile.getBuffer()
writeFileSync('output.cpn', buffer)
