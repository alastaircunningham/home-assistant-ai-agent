#!/usr/bin/with-contenv bashio

# Read options from Home Assistant add-on configuration
export ANTHROPIC_API_KEY=$(bashio::config 'anthropic_api_key')
export MODEL=$(bashio::config 'model')
export LOG_LEVEL=$(bashio::config 'log_level')

# SUPERVISOR_TOKEN is already available in the HA add-on environment
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"

bashio::log.info "Starting AI Agent..."
bashio::log.info "Model: ${MODEL}"
bashio::log.info "Log level: ${LOG_LEVEL}"

cd /app/server
exec node dist/index.js
