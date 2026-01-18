until tctl workflow list > /dev/null 2>&1; do
    echo 'Waiting for Temporal server to be ready...'
    sleep 5
done

echo 'Creating default namespace...'
tctl namespace register default || echo 'Namespace already exists.'

echo 'Y' | tctl admin cluster add-search-attributes --name OrderId --type INT && echo 'Search attribute OrderID added successfully.'
echo 'Y' | tctl admin cluster add-search-attributes --name UserId --type INT && echo 'Search attribute UserID added successfully.'
echo 'Y' | tctl admin cluster add-search-attributes --name Email --type TEXT && echo 'Search attribute Email added successfully.'

echo 'Temporal Search attributes added successfully.'