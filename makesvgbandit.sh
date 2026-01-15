#!/bin/bash


run_bandit() {
    local path=$1
    local label=$2
    local output="${label}bandit"
    
    bandit -r $path -f json -o ${output}.json 2>/dev/null || true
    issues=$(python3 -c "import json; data=json.load(open('${output}.json')); print(len(data['results']))")
    echo "$label Bandit issues: $issues"
    rm -f ${output}.svg
    
    if [ "$issues" -eq 0 ]; then
        color="green"
        value="passing"
    elif [ "$issues" -le 2 ]; then
        color="yellow"
        value="$issues issues"
    elif [ "$issues" -le 5 ]; then
        color="orange"
        value="$issues issues"
    else
        color="red"
        value="$issues issues"
    fi
    
    anybadge --label="$label bandit" --value="$value" --color=$color --file=${output}.svg
}

run_bandit "client/opensecureconf_client.py" "client"
run_bandit "gui/gui.py" "gui"
run_bandit "server/*.py" "server"


rm -rf clientbandit.json guibandit.json serverbandit.json