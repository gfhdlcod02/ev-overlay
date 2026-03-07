#!/usr/bin/env node
/**
 * R2 Lifecycle Policy Manager
 *
 * Applies and verifies lifecycle rules for the ev-overlay-snapshots bucket
 * per T096: Implement R2 lifecycle policy for 90-day snapshot retention
 */

const { S3Client, PutBucketLifecycleConfigurationCommand, GetBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')
const path = require('path')

// Configuration
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ev-overlay-snapshots'
const R2_ENDPOINT = process.env.R2_ENDPOINT || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_REGION = process.env.R2_REGION || 'auto'

// Check for required environment variables
function validateEnv() {
  const missing = []
  if (!R2_ENDPOINT) missing.push('R2_ENDPOINT')
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID')
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY')

  if (missing.length > 0) {
    console.error('Missing required environment variables:')
    missing.forEach(v => console.error(`  - ${v}`))
    console.error('\nSet these via environment or .env file')
    process.exit(1)
  }
}

// Create S3 client configured for R2
function createR2Client() {
  return new S3Client({
    region: R2_REGION,
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    },
    forcePathStyle: true // Required for R2
  })
}

// Load lifecycle policy from JSON file
function loadPolicy() {
  const policyPath = path.join(__dirname, 'policy.json')

  if (!fs.existsSync(policyPath)) {
    console.error(`Policy file not found: ${policyPath}`)
    process.exit(1)
  }

  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'))

  // Transform to AWS SDK format
  return {
    Rules: policy.rules.map(rule => ({
      ID: rule.id,
      Status: rule.status,
      Filter: {
        Prefix: rule.filter.prefix
      },
      ...(rule.expiration && {
        Expiration: {
          Days: rule.expiration.days
        }
      }),
      ...(rule.transition && {
        Transitions: rule.transition.map(t => ({
          Days: t.days,
          StorageClass: t.storageClass
        }))
      }),
      ...(rule.abortIncompleteMultipartUpload && {
        AbortIncompleteMultipartUpload: {
          DaysAfterInitiation: rule.abortIncompleteMultipartUpload.daysAfterInitiation
        }
      })
    }))
  }
}

// Apply lifecycle configuration to bucket
async function applyLifecyclePolicy() {
  console.log(`Applying lifecycle policy to bucket: ${BUCKET_NAME}`)
  console.log(`Endpoint: ${R2_ENDPOINT}`)
  console.log('')

  const client = createR2Client()
  const lifecycleConfig = loadPolicy()

  try {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: lifecycleConfig
    })

    await client.send(command)

    console.log('✓ Lifecycle policy applied successfully')
    console.log('')
    console.log('Rules configured:')

    lifecycleConfig.Rules.forEach((rule, index) => {
      console.log(`\n${index + 1}. ${rule.ID}`)
      console.log(`   Status: ${rule.Status}`)
      console.log(`   Filter: prefix="${rule.Filter.Prefix}"`)

      if (rule.Expiration) {
        console.log(`   Expiration: ${rule.Expiration.Days} days`)
      }

      if (rule.Transitions) {
        rule.Transitions.forEach(t => {
          console.log(`   Transition: to ${t.StorageClass} after ${t.Days} days`)
        })
      }

      if (rule.AbortIncompleteMultipartUpload) {
        console.log(`   Abort Incomplete Uploads: after ${rule.AbortIncompleteMultipartUpload.DaysAfterInitiation} days`)
      }
    })

    return true
  } catch (error) {
    console.error('✗ Failed to apply lifecycle policy:')
    console.error(error instanceof Error ? error.message : error)
    return false
  }
}

// Verify current lifecycle configuration
async function verifyLifecyclePolicy() {
  console.log('\nVerifying current lifecycle configuration...')
  console.log('')

  const client = createR2Client()

  try {
    const command = new GetBucketLifecycleConfigurationCommand({
      Bucket: BUCKET_NAME
    })

    const response = await client.send(command)

    if (!response.Rules || response.Rules.length === 0) {
      console.log('⚠ No lifecycle rules configured')
      return false
    }

    console.log(`✓ Found ${response.Rules.length} lifecycle rule(s):`)

    response.Rules.forEach((rule, index) => {
      console.log(`\n${index + 1}. ${rule.ID}`)
      console.log(`   Status: ${rule.Status}`)

      if (rule.Expiration?.Days) {
        console.log(`   Expiration: ${rule.Expiration.Days} days`)
      }
    })

    // Verify required rule exists
    const hasSnapshotRule = response.Rules.some(
      r => r.ID === 'snapshot-retention-90-days' && r.Status === 'Enabled'
    )

    if (hasSnapshotRule) {
      console.log('\n✓ Required snapshot retention rule (90 days) is active')
    } else {
      console.log('\n⚠ Required snapshot retention rule not found or not enabled')
    }

    return hasSnapshotRule
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    if (errorMsg.includes('NoSuchLifecycleConfiguration')) {
      console.log('⚠ No lifecycle configuration exists for this bucket')
      return false
    }

    console.error('✗ Failed to verify lifecycle policy:')
    console.error(errorMsg)
    return false
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'apply'

  validateEnv()

  switch (command) {
    case 'apply':
      const applied = await applyLifecyclePolicy()
      process.exit(applied ? 0 : 1)

    case 'verify':
      const verified = await verifyLifecyclePolicy()
      process.exit(verified ? 0 : 1)

    case 'apply-and-verify':
      const success = await applyLifecyclePolicy()
      if (success) {
        const verified = await verifyLifecyclePolicy()
        process.exit(verified ? 0 : 1)
      }
      process.exit(1)

    default:
      console.log('Usage: node apply-lifecycle.js [apply|verify|apply-and-verify]')
      process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { applyLifecyclePolicy, verifyLifecyclePolicy }
